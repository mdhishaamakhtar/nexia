package controllers

import (
	"net/http"
	"strconv"

	"nexia-backend/internal/middleware"
	"nexia-backend/internal/models"
	"nexia-backend/internal/services"
	"nexia-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// ProfileController handles CRUD for profile resources.
type ProfileController struct {
	Service *services.ProfileService
}

// NewProfileController constructs a ProfileController.
func NewProfileController(service *services.ProfileService) *ProfileController {
	return &ProfileController{Service: service}
}

// CreateProfile creates a new profile for the authenticated user.
// The response body contains only the new profile's ID.
//
// @Summary      Create a profile
// @Tags         profiles
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        profile  body      models.Profile       true  "Profile payload"
// @Success      201      {object}  map[string]uint64    "Created profile ID"
// @Failure      400      {object}  utils.ErrorResponse  "Validation error (e.g. >3 top songs)"
// @Failure      401      {object}  utils.ErrorResponse
// @Failure      500      {object}  utils.ErrorResponse
// @Router       /profiles [post]
func (ctrl *ProfileController) CreateProfile(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		utils.RespondWithError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User ID not found in context")
		return
	}

	var profile models.Profile
	if err := c.ShouldBindJSON(&profile); err != nil {
		utils.RespondWithError(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	if err := ctrl.Service.CreateProfile(&profile, userID); err != nil {
		respondWithServiceError(c, err)
		return
	}

	utils.RespondWithSuccess(c, http.StatusCreated, gin.H{"id": profile.ID})
}

// GetProfile returns a full profile including all child associations.
// Returns 404 if the profile doesn't exist or belongs to a different user.
//
// @Summary      Get a profile
// @Tags         profiles
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int            true  "Profile ID"
// @Success      200  {object}  models.Profile
// @Failure      401  {object}  utils.ErrorResponse
// @Failure      404  {object}  utils.ErrorResponse
// @Failure      500  {object}  utils.ErrorResponse
// @Router       /profiles/{id} [get]
func (ctrl *ProfileController) GetProfile(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		utils.RespondWithError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User ID not found in context")
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.RespondWithError(c, http.StatusBadRequest, "BAD_REQUEST", "Invalid ID format")
		return
	}

	profile, err := ctrl.Service.GetProfile(id, userID)
	if err != nil {
		respondWithServiceError(c, err)
		return
	}

	utils.RespondWithSuccess(c, http.StatusOK, profile)
}

// ListProfiles returns a paginated list of profiles for the authenticated user.
// Page defaults to 1, limit defaults to 10 (max 100). Both search and
// relationship_type filters are optional and can be combined.
//
// @Summary      List profiles
// @Tags         profiles
// @Produce      json
// @Security     BearerAuth
// @Param        page               query  int     false  "Page number (default 1)"
// @Param        limit              query  int     false  "Page size (default 10, max 100)"
// @Param        search             query  string  false  "Case-insensitive name substring filter"
// @Param        relationship_type  query  string  false  "Exact relationship type filter"
// @Success      200  {object}  map[string]interface{}  "data, total, page, limit"
// @Failure      401  {object}  utils.ErrorResponse
// @Failure      500  {object}  utils.ErrorResponse
// @Router       /profiles [get]
func (ctrl *ProfileController) ListProfiles(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		utils.RespondWithError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User ID not found in context")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.Query("search")
	relationshipType := c.Query("relationship_type")

	profiles, total, err := ctrl.Service.ListProfiles(page, limit, search, relationshipType, userID)
	if err != nil {
		respondWithServiceError(c, err)
		return
	}

	utils.RespondWithSuccess(c, http.StatusOK, gin.H{
		"data":  profiles,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// UpdateProfile fully overwrites a profile. Child associations not present in the
// payload are deleted. Omitted child slices are treated as empty.
//
// @Summary      Update a profile
// @Tags         profiles
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id       path      int              true  "Profile ID"
// @Param        profile  body      models.Profile   true  "Full profile payload"
// @Success      200      {object}  map[string]string
// @Failure      400      {object}  utils.ErrorResponse  "Validation error"
// @Failure      401      {object}  utils.ErrorResponse
// @Failure      404      {object}  utils.ErrorResponse
// @Failure      500      {object}  utils.ErrorResponse
// @Router       /profiles/{id} [put]
func (ctrl *ProfileController) UpdateProfile(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		utils.RespondWithError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User ID not found in context")
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.RespondWithError(c, http.StatusBadRequest, "BAD_REQUEST", "Invalid ID format")
		return
	}

	var profile models.Profile
	if err := c.ShouldBindJSON(&profile); err != nil {
		utils.RespondWithError(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	if err := ctrl.Service.UpdateProfile(id, &profile, userID); err != nil {
		respondWithServiceError(c, err)
		return
	}

	utils.RespondWithSuccess(c, http.StatusOK, gin.H{"message": "Profile updated successfully"})
}

// DeleteProfile deletes a profile and all its child records (via ON DELETE CASCADE).
// The vector embedding is also removed asynchronously via the queue.
//
// @Summary      Delete a profile
// @Tags         profiles
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "Profile ID"
// @Success      200  {object}  map[string]string
// @Failure      400  {object}  utils.ErrorResponse  "Invalid ID"
// @Failure      401  {object}  utils.ErrorResponse
// @Failure      404  {object}  utils.ErrorResponse
// @Failure      500  {object}  utils.ErrorResponse
// @Router       /profiles/{id} [delete]
func (ctrl *ProfileController) DeleteProfile(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		utils.RespondWithError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User ID not found in context")
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.RespondWithError(c, http.StatusBadRequest, "BAD_REQUEST", "Invalid ID format")
		return
	}

	if err := ctrl.Service.DeleteProfile(id, userID); err != nil {
		respondWithServiceError(c, err)
		return
	}

	utils.RespondWithSuccess(c, http.StatusOK, gin.H{"message": "Profile deleted successfully"})
}
