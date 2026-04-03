package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/VK-10/oversite/backend/helpers"
	"github.com/VK-10/oversite/backend/internal/database"
	"github.com/VK-10/oversite/backend/models"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

func (apiCfg *ApiConfig) HandlerCreateFeedFollow(w http.ResponseWriter, r *http.Request, user database.User) {
	type parameters struct {
		FeedID uuid.UUID `json:"feed_id"`
	}

	decoder := json.NewDecoder(r.Body)
	params := parameters{}
	err := decoder.Decode(&params)
	if err != nil {
		helpers.RespondWithError(w, 400, fmt.Sprintf("Error parsing JSON:%s", err))
		return
	}

	feedFollow, err := apiCfg.DB.CreateFeedFollow(r.Context(), database.CreateFeedFollowParams{
		ID:        uuid.New(),
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
		UserID:    user.ID,
		FeedID:    params.FeedID,
	})

	if err != nil {
		helpers.RespondWithError(w, 400, fmt.Sprintf("Couldnt create feed follows:%s", err))
		return
	}
	helpers.ResponseWithJSON(w, 201, models.DatabaseFeedFollowToFeedFollow(feedFollow))

}

func (apiCfg *ApiConfig) HandlerGetFeedFollow(w http.ResponseWriter, r *http.Request, user database.User) {

	feedFollows, err := apiCfg.DB.GetFeedFollow(r.Context(), user.ID)

	if err != nil {
		helpers.RespondWithError(w, 400, fmt.Sprintf("Couldnt get feed follows:%s", err))
		return
	}
	helpers.ResponseWithJSON(w, 201, models.DatabaseFeedFollowsToFeedFollows(feedFollows))

}

func (apiCfg *ApiConfig) HandlerDeleteFeedFollow(w http.ResponseWriter, r *http.Request, user database.User) {

	feedFollowIDStr := chi.URLParam(r, "feedFollowID")
	feedFollowID, err := uuid.Parse(feedFollowIDStr)
	if err != nil {
		helpers.RespondWithError(w, 400, fmt.Sprintf("Couldnt parse feed follow id:%s", err))
		return
	}

	errDel := apiCfg.DB.DeleteFeedFollow(r.Context(), database.DeleteFeedFollowParams{
		ID:     feedFollowID,
		UserID: user.ID,
	})
	if errDel != nil {
		helpers.RespondWithError(w, 400, fmt.Sprintf("Couldnt dalete feed follows:%s", errDel))
		return
	}

	helpers.ResponseWithJSON(w, 200, struct{}{})
}
