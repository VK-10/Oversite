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

func (apiCfg *ApiConfig) HandlerCreateFeed(w http.ResponseWriter, r *http.Request, user database.User) {
	type parameters struct {
		Name string `json:"name"`
		URL  string `json:"url"`
	}
	decoder := json.NewDecoder(r.Body)
	params := parameters{}
	err := decoder.Decode(&params)
	if err != nil {
		helpers.RespondWithError(w, 400, fmt.Sprintf("Error parsing JSON:%s", err))
		return
	}

	feed, err := apiCfg.DB.CreateFeed(r.Context(), database.CreateFeedParams{
		ID:        uuid.New(),
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
		Name:      params.Name,
		Url:       params.URL,
		UserID:    user.ID,
	})

	if err != nil {
		helpers.RespondWithError(w, 400, fmt.Sprintf("Couldnt create feed:%s", err))
		return
	}
	helpers.ResponseWithJSON(w, 201, models.DatabaseFeedToFeed(feed))

}

func (apiCfg *ApiConfig) HandlerGetsFeed(w http.ResponseWriter, r *http.Request) {

	feeds, err := apiCfg.DB.GetFeeds(r.Context())

	if err != nil {
		helpers.RespondWithError(w, 400, fmt.Sprintf("Couldnt get feed:%s", err))
		return
	}
	helpers.ResponseWithJSON(w, 201, models.DatabaseFeedsToFeeds(feeds))

}

// func (apiCfg *ApiConfig) HandlerGetUser(w http.ResponseWriter, r *http.Request, user database.User) {
// 	helpers.ResponseWithJSON(w, 200, models.DatabaseUserToUser(user))
// }
