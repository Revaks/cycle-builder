//go:build windows

package main

import "syscall"

// prepareConsole switches the Windows console to UTF-8 so Russian messages are
// readable in the console window opened by double-clicking the executable.
func prepareConsole() {
	kernel32 := syscall.NewLazyDLL("kernel32.dll")
	setConsoleOutputCP := kernel32.NewProc("SetConsoleOutputCP")
	_, _, _ = setConsoleOutputCP.Call(65001)
}
