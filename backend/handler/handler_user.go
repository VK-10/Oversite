package handler

import "net/http"

func HandlerReadiness(w http.ResponseWriter, r *http.Request) {
	ResponseWithJSON(w, 200, struct{}{})

}
