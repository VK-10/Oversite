package handler

import (
	"net/http"

	"github.com/VK-10/oversite/backend/helpers"
)

func HandleErr(w http.ResponseWriter, r *http.Request) {
	helpers.RespondWithError(w, 400, "Something went wrong")
}
