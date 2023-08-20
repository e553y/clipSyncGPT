package main

import (
	"io"
	"os"
	"strings"
	"fmt"
	"log"
	"os/exec"
	"time"
	"github.com/gorilla/websocket"
)

var addr = "192.168.1.76:8080"
var reconnectDelay = 5 * time.Second

func init() {
	// Check if command-line argument is provided
	if len(os.Args) > 1 {
		addr = os.Args[1]
	}
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
	err = cmd.Run()
	if err != nil {
		log.Fatal(err)
	}
}

func connectToServer() *websocket.Conn {
	c, _, err := websocket.DefaultDialer.Dial("ws://"+addr, nil)
	if err != nil {
		log.Println("Failed to connect:", err)
		time.Sleep(reconnectDelay)
		return connectToServer()
	}
	log.Println("Successfully connected to the server!")
	return c
}

func main() {
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
		if currentClipboard != lastClipboard {
			fmt.Println("Sending:", string(currentClipboard))
			err := c.WriteMessage(websocket.TextMessage, []byte(currentClipboard))
			if err != nil {
				log.Println("Failed to write message:", err)
				time.Sleep(reconnectDelay)
				c = connectToServer()
				continue
			}
			lastClipboard = currentClipboard
		}
		time.Sleep(1 * time.Second)
	}
}