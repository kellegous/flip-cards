package main

import (
  "flag"
  "fmt"
  "github.com/kellegous/pork"
  "net/http"
  "path/filepath"
  "runtime"
)

func findRoot() (string, error) {
  _, file, _, _ := runtime.Caller(0)
  return filepath.Abs(filepath.Join(filepath.Dir(file), "../.."))
}

func main() {
  flagAddr := flag.String("addr", ":8080", "")
  flag.Parse()

  root, err := findRoot()
  if err != nil {
    panic(err)
  }

  fmt.Printf("root = %s\n", root)

  r := pork.NewRouter(nil, nil, nil)

  r.RespondWith("/", pork.Content(pork.NewConfig(pork.None),
    http.Dir(filepath.Join(root, "pub"))))

  if err := http.ListenAndServe(*flagAddr, r); err != nil {
    panic(err)
  }
}
