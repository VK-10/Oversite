package handler

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/VK-10/oversite/backend/helpers"
	"github.com/VK-10/oversite/backend/internal/auth"
	"github.com/VK-10/oversite/backend/internal/database"
)

type AuthedHandler func(http.ResponseWriter, *http.Request, database.User)

func (cfg *ApiConfig) MiddlewareAuth(handler AuthedHandler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		apikey, err := auth.GetApiKey(r.Header)
		slog.Error(apikey)
		if err != nil {
			helpers.RespondWithError(w, 403, fmt.Sprintf("Auth error: %v", err))
			return
		}

		user, err := cfg.DB.GetUserByApiKey(r.Context(), apikey)
		if err != nil {
			helpers.RespondWithError(w, 400, fmt.Sprintf("couldnt get user: %v", err))
			return
		}

		handler(w, r, user)
	}
}
