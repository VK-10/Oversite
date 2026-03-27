package handler

import (
	"net/http"

	"github.com/VK-10/oversite/backend/helpers"
)

func HandlerReadiness(w http.ResponseWriter, r *http.Request) {
	helpers.ResponseWithJSON(w, 200, struct{}{})

}
