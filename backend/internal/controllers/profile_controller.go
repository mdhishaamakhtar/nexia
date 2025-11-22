package controllers

import (
	"net/http"
	"strconv"

	"nexia-backend/internal/models"
	"nexia-backend/internal/services"
	"nexia-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type ProfileController struct {
	Service *services.ProfileService
}

func NewProfileController(service *services.ProfileService) *ProfileController {
	return &ProfileController{Service: service}
}

// CreateProfile godoc
// @Summary Create a new profile
// @Description Create a new profile with all child attributes
// @Tags profiles
// @Accept json
// @Produce json
// @Param profile body models.Profile true "Profile Data"
// @Security BearerAuth
// @Success 201 {object} map[string]uint64
// @Failure 400 {object} utils.ErrorResponse
// @Failure 401 {object} utils.ErrorResponse
// @Failure 500 {object} utils.ErrorResponse
// @Router /profiles [post]
func (ctrl *ProfileController) CreateProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		utils.RespondWithError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User ID not found in context")
		return
	}

	var profile models.Profile
	if err := c.ShouldBindJSON(&profile); err != nil {
		utils.RespondWithError(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	if err := ctrl.Service.CreateProfile(&profile, userID.(uint64)); err != nil {
		utils.RespondWithError(c, http.StatusInternalServerError, "SERVER_ERROR", err.Error())
		return
	}

	utils.RespondWithSuccess(c, http.StatusCreated, gin.H{"id": profile.ID})
}

// GetProfile godoc
// @Summary Get a profile by ID
// @Description Get full profile details including all child lists
// @Tags profiles
// @Accept json
// @Produce json
// @Param id path int true "Profile ID"
// @Security BearerAuth
// @Success 200 {object} models.Profile
// @Failure 401 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Failure 500 {object} utils.ErrorResponse
// @Router /profiles/{id} [get]
func (ctrl *ProfileController) GetProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		utils.RespondWithError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User ID not found in context")
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.RespondWithError(c, http.StatusBadRequest, "BAD_REQUEST", "Invalid ID format")
		return
	}

	profile, err := ctrl.Service.GetProfile(id, userID.(uint64))
	if err != nil {
		utils.RespondWithError(c, http.StatusNotFound, "NOT_FOUND", "Profile not found")
		return
	}

	utils.RespondWithSuccess(c, http.StatusOK, profile)
}

// ListProfiles godoc
// @Summary List profiles
// @Description List profiles with pagination and filtering
// @Tags profiles
// @Accept json
// @Produce json
// @Param page query int false "Page number"
// @Param limit query int false "Page limit"
// @Param search query string false "Search by name"
// @Param relationship_type query string false "Filter by relationship type"
// @Security BearerAuth
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} utils.ErrorResponse
// @Failure 500 {object} utils.ErrorResponse
// @Router /profiles [get]
func (ctrl *ProfileController) ListProfiles(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		utils.RespondWithError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User ID not found in context")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.Query("search")
	relationshipType := c.Query("relationship_type")

	profiles, total, err := ctrl.Service.ListProfiles(page, limit, search, relationshipType, userID.(uint64))
	if err != nil {
		utils.RespondWithError(c, http.StatusInternalServerError, "SERVER_ERROR", err.Error())
		return
	}

	utils.RespondWithSuccess(c, http.StatusOK, gin.H{
		"data":  profiles,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// UpdateProfile godoc
// @Summary Update a profile
// @Description Full overwrite update of a profile
// @Tags profiles
// @Accept json
// @Produce json
// @Param id path int true "Profile ID"
// @Param profile body models.Profile true "Profile Data"
// @Security BearerAuth
// @Success 200 {object} map[string]string
// @Failure 400 {object} utils.ErrorResponse
// @Failure 401 {object} utils.ErrorResponse
// @Failure 500 {object} utils.ErrorResponse
// @Router /profiles/{id} [put]
func (ctrl *ProfileController) UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
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

	if err := ctrl.Service.UpdateProfile(id, &profile, userID.(uint64)); err != nil {
		utils.RespondWithError(c, http.StatusInternalServerError, "SERVER_ERROR", err.Error())
		return
	}

	utils.RespondWithSuccess(c, http.StatusOK, gin.H{"message": "Profile updated successfully"})
}

// DeleteProfile godoc
// @Summary Delete a profile
// @Description Delete a profile and all its child entities
// @Tags profiles
// @Accept json
// @Produce json
// @Param id path int true "Profile ID"
// @Security BearerAuth
// @Success 200 {object} map[string]string
// @Failure 400 {object} utils.ErrorResponse
// @Failure 401 {object} utils.ErrorResponse
// @Failure 500 {object} utils.ErrorResponse
// @Router /profiles/{id} [delete]
func (ctrl *ProfileController) DeleteProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		utils.RespondWithError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User ID not found in context")
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.RespondWithError(c, http.StatusBadRequest, "BAD_REQUEST", "Invalid ID format")
		return
	}

	if err := ctrl.Service.DeleteProfile(id, userID.(uint64)); err != nil {
		utils.RespondWithError(c, http.StatusInternalServerError, "SERVER_ERROR", err.Error())
		return
	}

	utils.RespondWithSuccess(c, http.StatusOK, gin.H{"message": "Profile deleted successfully"})
}
