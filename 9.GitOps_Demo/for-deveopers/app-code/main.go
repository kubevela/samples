// main.go

package main

import (
	"database/sql"
	"fmt"
	"net/http"
	"os"

	_ "github.com/go-sql-driver/mysql"
)

const VERSION = "0.1.8"

func main() {
	pwd := os.Getenv("DB_PASSWORD")
	host := os.Getenv("DB_HOST")
	db, err := sql.Open("mysql", fmt.Sprintf("root:%s@tcp(%s)/mysql", pwd, host))
	if err != nil {
		panic(err)
	}
	defer db.Close()
	// make sure connection is available
	err = db.Ping()
	if err != nil {
		panic(err)
	}

	CreateTable(db)

	InsertInitData(db)

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		_, _ = fmt.Fprintf(w, "Version: %s\n", VERSION)
	})
	http.HandleFunc("/db", func(w http.ResponseWriter, r *http.Request) {
		rows, err := db.Query("select * from userinfo;")
		if err != nil {
			_, _ = fmt.Fprintf(w, "Error: %v\n", err)
		}
		for rows.Next() {
			var username string
			var desc string
			err = rows.Scan(&username, &desc)
			if err != nil {
				_, _ = fmt.Fprintf(w, "Scan Error: %v\n", err)
			}
			_, _ = fmt.Fprintf(w, "User: %s \nDescription: %s\n\n", username, desc)
		}
	})

	if err := http.ListenAndServe(":8088", nil); err != nil {
		panic(err.Error())
	}
}

func CreateTable(db *sql.DB) {
	stmt, err := db.Prepare(createTable)
	if err != nil {
		panic(err)
	}
	defer stmt.Close()

	_, err = stmt.Exec()
	if err != nil {
		panic(err)
	}
}

func InsertInitData(db *sql.DB) {
	stmt, err := db.Prepare(insertInitData)
	if err != nil {
		panic(err)
	}
	defer stmt.Close()

	_, err = stmt.Exec("KubeVela", "It's a test user")
	if err != nil {
		panic(err)
	}
}

var createTable = `
CREATE TABLE IF NOT EXISTS userinfo (
  username     VARCHAR(32) PRIMARY KEY,
  description  VARCHAR(32)
);
`

var insertInitData = `
INSERT IGNORE INTO userinfo SET username = ?, description = ?
`
