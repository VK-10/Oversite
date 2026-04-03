package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/VK-10/oversite/backend/helpers"
	"github.com/VK-10/oversite/backend/internal/database"
	"github.com/VK-10/oversite/backend/models"
	"github.com/google/uuid"
)

func (apiCfg *ApiConfig) HandleCreateUser(w http.ResponseWriter, r *http.Request) {
	type parameters struct {
		Name string `json:"name"`
	}
	decoder := json.NewDecoder(r.Body)
	params := parameters{}
	err := decoder.Decode(&params)
	if err != nil {
		helpers.RespondWithError(w, 400, fmt.Sprintf("Error parsing JSON:%s", err))
		return
	}

	user, err := apiCfg.DB.CreateUser(r.Context(), database.CreateUserParams{
		ID:        uuid.New(),
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
		Name:      params.Name,
	})
	if err != nil {
		helpers.RespondWithError(w, 400, fmt.Sprintf("Couldnt create user:%s", err))
		return
	}
	helpers.ResponseWithJSON(w, 201, models.DatabaseUserToUser(user))

}

func (apiCfg *ApiConfig) HandlerGetUser(w http.ResponseWriter, r *http.Request, user database.User) {
	helpers.ResponseWithJSON(w, 200, models.DatabaseUserToUser(user))
}
