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
	if len(os.Args) > 1 {
		addr = os.Args[1]
	}
}

func isKeyComboPressed() bool {
	script := `
tell application "System Events"
    set cmdDown to key code 55 is down
    set optDown to key code 58 is down
    set xDown to key code 7 is down
    if cmdDown and optDown and xDown then
        return true
    else
        return false
    end if
end tell
`
	cmd := exec.Command("/usr/bin/osascript", "-e", script)
	out, err := cmd.Output()
	return err == nil && strings.TrimSpace(string(out)) == "true"
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
		// Check if the key combination is pressed
		if isKeyComboPressed() {
			currentClipboard := getClipboard()
			if currentClipboard != lastClipboard {
				fmt.Println("Sending:", currentClipboard)
				err := c.WriteMessage(websocket.TextMessage, []byte(currentClipboard))
				if err != nil {
					log.Println("Failed to send message:", err)
					time.Sleep(reconnectDelay)
					c = connectToServer()
					continue
				}
				lastClipboard = currentClipboard
			}
		}
		time.Sleep(500 * time.Millisecond) // Checking every 500ms for the key combination
	}
}