package main

import (
	"log"
	"net/http"
	"os"
	"text/template"
)

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		tmpl, err := template.ParseFiles("./static/index.html")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}

		data := struct {
			Host string
			User string
		}{
			Host: os.Getenv("DB_HOST"),
			User: os.Getenv("DB_USER"),
		}

		err = tmpl.Execute(w, data)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	})

	log.Println("Start listening http port 9080 ...")
	if err := http.ListenAndServe(":9080", nil); err != nil {
		panic(err)
	}
}
