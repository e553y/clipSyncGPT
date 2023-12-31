package main

import (
	"runtime"
	"bufio"
	"encoding/json"
	"fmt"
	"github.com/gorilla/websocket"
	"io"
	"log"
	"os"
	"os/exec"
	"strings"
	"time"
)

type Config struct {
	ReconnectDelay int    `json:"reconnectDelay"`
	Preamble       string `json:"preamble"`
	Port           string `json:"port"`
	FallbackAddr   string `json:"fallbackAddr"`
}

var config Config

func readServersFromFile() ([]string, error) {
	file, err := os.Open("servers.txt") // open file with server addresses
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var servers []string
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		servers = append(servers, scanner.Text())
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	return servers, nil
}


func getServerAddresses() []string {
	var servers []string

	// add address from args, if provided
	if len(os.Args) > 1 {
		servers = append(servers, os.Args[1])
	}

	// get default gateway from command line
	out, err := exec.Command("netstat", "-rn").Output()
	if err != nil {
		log.Println("Failed to get default gateway:", err)
	} else {
		lines := strings.Split(string(out), "\n")
		for _, line := range lines {
			if strings.HasPrefix(line, "default") {
				fields := strings.Fields(line)
				if len(fields) >= 2 {
					servers = append(servers, fields[1]+":"+config.Port) // add default gateway to the list
					break
				}
			}
		}
	}

	// read addresses from file
	fileServers, err := readServersFromFile()
	if err != nil {
		log.Println("Failed to read servers from file:", err)
	} else {
		servers = append(servers, fileServers...)
	}

	// add fallback address to the list
	servers = append(servers, config.FallbackAddr)

	return servers
}

func getClipboard() string {
    var out []byte
    var err error

    if runtime.GOOS == "darwin" {
        out, err = exec.Command("osascript", "-e", "get the clipboard as string").Output()
    } else if runtime.GOOS == "linux" {
        out, err = exec.Command("xclip", "-o", "-selection", "clipboard").Output()
    } else {
        log.Println("Warning: Unsupported operating system for clipboard interaction")
        return ""
    }

    if err != nil {
        log.Println("Warning: Unable to get clipboard content:", err)
        return ""
    }

    return strings.TrimSpace(string(out))
}

func setClipboard(data string) {
    var cmd *exec.Cmd
    var stdin io.WriteCloser
    var err error

    if runtime.GOOS == "darwin" {
        cmd = exec.Command("pbcopy")
    } else if runtime.GOOS == "linux" {
        cmd = exec.Command("xclip", "-in", "-selection", "clipboard")
    } else {
        log.Println("Warning: Unsupported operating system for clipboard interaction")
        return
    }

    stdin, err = cmd.StdinPipe()
    if err != nil {
        log.Fatal(err)
    }

    go func() {
        defer stdin.Close()
        io.WriteString(stdin, data)
    }()
    cmd.Run()
}


func connectToServer() *websocket.Conn {
	servers := getServerAddresses()
	for _, addr := range servers {
		c, _, err := websocket.DefaultDialer.Dial("ws://"+addr, nil)
		if err != nil {
			log.Println("Failed to connect to", addr, ":", err)
			continue
		}
		log.Println("Successfully connected to the server at", addr)
		return c
	}
	log.Println("Failed to connect to all servers. Retrying...")
	time.Sleep(time.Duration(config.ReconnectDelay) * time.Second)
	return connectToServer()
}

func readConfig() Config {
	file, err := os.Open("config.json")
	if err != nil {
		log.Fatal(err)
	}
	defer file.Close()

	decoder := json.NewDecoder(file)
	config := Config{}
	err = decoder.Decode(&config)
	if err != nil {
		log.Fatal(err)
	}

	return config
}

func main() {
	config = readConfig()
	c := connectToServer()
	defer c.Close()
	lastClipboard := ""

	go func() {
		for {
			_, message, err := c.ReadMessage()
			if err != nil {
				log.Println("Connection lost. Attempting to reconnect...")
				c = connectToServer()
				continue
			}
			fmt.Println("Received:", string(message))
			lastClipboard = strings.TrimSpace(string(message))
			setClipboard(lastClipboard)
		}
	}()

	go func() {
		reader := bufio.NewReader(os.Stdin)
		for {
			fmt.Print("Enter text: ")
			text, _ := reader.ReadString('\n')
			text = strings.TrimSpace(text)

			err := c.WriteMessage(websocket.TextMessage, []byte(text))
			if err != nil {
				log.Println("Failed to send message:", err)
			}
		}
	}()

	for {
		currentClipboard := getClipboard()
		if strings.HasPrefix(currentClipboard, config.Preamble) {
			// If clipboard starts with preamble, strip it out
			currentClipboard = strings.TrimPrefix(currentClipboard, config.Preamble)

			if currentClipboard != lastClipboard {
				fmt.Println("Sending:", currentClipboard)
				err := c.WriteMessage(websocket.TextMessage, []byte(currentClipboard))
				if err != nil {
					log.Println("Failed to send message:", err)
					time.Sleep(time.Duration(config.ReconnectDelay) * time.Second)
					c = connectToServer()
					continue
				}
				lastClipboard = currentClipboard
			}
		}
		time.Sleep(1 * time.Second)


	}
}