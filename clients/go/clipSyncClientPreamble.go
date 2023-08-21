package main

import (
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
					servers = append(servers, fields[1]) // add default gateway to the list
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
	out, err := exec.Command("osascript", "-e", "get the clipboard as string").Output()
	if err != nil {
		log.Println("Warning: Unable to get clipboard content:", err)
		return ""
	}
	return strings.TrimSpace(string(out))
}

func setClipboard(data string) {
	cmd := exec.Command("pbcopy")
	stdin, err := cmd.StdinPipe()
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
		c, _, err := websocket.DefaultDialer.Dial("ws://"+addr+":"+config.Port, nil)
		if err != nil {
			log.Println("Failed to connect to", addr, ":", err)
			continue
		}
		log.Println("Successfully connected to the server at", addr+":"+config.Port)
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