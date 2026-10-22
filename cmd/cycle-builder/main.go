// Command cycle-builder serves the built web app on localhost and opens it in
// the default browser. The static build is embedded into the executable, so a
// Windows user only needs this one file.
package main

import (
	"context"
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path"
	"runtime"
	"strings"
	"time"
)

//go:embed dist
var embedded embed.FS

const defaultPort = 17843

var version = "dev"

type spaHandler struct {
	root  fs.FS
	files http.Handler
}

func (h spaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("X-Content-Type-Options", "nosniff")

	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	name := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
	if name == "" || name == "." {
		name = "index.html"
	}

	if _, err := fs.Stat(h.root, name); err != nil {
		// The app is a single page. Unknown paths without a file extension
		// fall back to index.html; missing assets stay 404.
		if strings.Contains(name, ".") {
			http.NotFound(w, r)
			return
		}
		r.URL.Path = "/"
		name = "index.html"
	}

	if strings.HasPrefix(name, "assets/") {
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	} else {
		w.Header().Set("Cache-Control", "no-cache")
	}

	h.files.ServeHTTP(w, r)
}

func openBrowser(url string) error {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	return cmd.Start()
}

func fatal(format string, args ...any) {
	fmt.Fprintf(os.Stderr, "Ошибка: "+format+"\n", args...)
	fmt.Fprintln(os.Stderr, "Нажмите Enter, чтобы закрыть окно…")
	var ignored string
	_, _ = fmt.Scanln(&ignored)
	os.Exit(1)
}

func main() {
	prepareConsole()
	log.SetFlags(0)

	port := flag.Int("port", defaultPort, "локальный порт (по умолчанию 17843)")
	noBrowser := flag.Bool("no-browser", false, "не открывать браузер автоматически")
	showVersion := flag.Bool("version", false, "показать версию")
	flag.Parse()

	if *showVersion {
		fmt.Println(version)
		return
	}

	if *port < 1 || *port > 65535 {
		fatal("некорректный порт %d", *port)
	}

	sub, err := fs.Sub(embedded, "dist")
	if err != nil {
		fatal("не удалось прочитать встроенные файлы: %v", err)
	}

	listener, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", *port))
	if err != nil {
		fatal(
			"не удалось занять порт %d. Возможно, приложение уже запущено в другом окне. Закройте его или укажите другой порт через -port.\n%v",
			*port,
			err,
		)
	}
	defer listener.Close()

	url := fmt.Sprintf("http://127.0.0.1:%d", *port)
	handler := spaHandler{root: sub, files: http.FileServer(http.FS(sub))}
	server := &http.Server{
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	fmt.Printf("Конструктор цикла запущен: %s\n", url)
	fmt.Println("Не закрывайте это окно, пока работаете с приложением.")
	fmt.Println("Чтобы остановить приложение, закройте это окно или нажмите Ctrl+C.")

	if !*noBrowser {
		if err := openBrowser(url); err != nil {
			fmt.Printf("Не удалось открыть браузер автоматически: %v\n", err)
			fmt.Printf("Откройте вручную: %s\n", url)
		}
	}

	go func() {
		if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
			fmt.Fprintf(os.Stderr, "Сервер остановлен с ошибкой: %v\n", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
}
