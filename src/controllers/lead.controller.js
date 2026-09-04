const LeadService = require('../services/leadService');
const ConversionService = require('../services/conversionService');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * List leads with filters, pagination, and RBAC scoping
 */
const listLeads = asyncHandler(async (req, res) => {
  const result = await LeadService.listLeads(req.query, req.user);
  return ApiResponse.success(res, 200, 'Leads retrieved successfully', result.data, result.meta);
});

/**
 * Create a new lead
 */
const createLead = asyncHandler(async (req, res) => {
  const lead = await LeadService.createLead(req.body, req.user);
  return ApiResponse.success(res, 201, 'Lead created successfully', lead);
});

/**
 * Get single lead details by ID
 */
const getLeadById = asyncHandler(async (req, res) => {
  const lead = await LeadService.getLeadById(req.params.id, req.user);
  return ApiResponse.success(res, 200, 'Lead retrieved successfully', lead);
});

/**
 * Update lead details
 */
const updateLead = asyncHandler(async (req, res) => {
  const lead = await LeadService.updateLead(req.params.id, req.body, req.user);
  return ApiResponse.success(res, 200, 'Lead updated successfully', lead);
});

/**
 * Assign / Reassign lead to a user
 */
const assignLead = asyncHandler(async (req, res) => {
  const lead = await LeadService.assignLead(req.params.id, req.body.assignedTo, req.user);
  return ApiResponse.success(res, 200, 'Lead assigned successfully', lead);
});

/**
 * Update lead status
 */
const updateStatus = asyncHandler(async (req, res) => {
  const lead = await LeadService.updateStatus(req.params.id, req.body.status, req.user);
  return ApiResponse.success(res, 200, 'Lead status updated successfully', lead);
});

/**
 * Add note to lead
 */
const addNote = asyncHandler(async (req, res) => {
  const lead = await LeadService.addNote(req.params.id, req.body.text, req.user);
  return ApiResponse.success(res, 200, 'Note added successfully', lead);
});

/**
 * Convert Lead to Customer and optional Deal
 */
const convertLead = asyncHandler(async (req, res) => {
  const result = await ConversionService.convertLead(req.params.id, req.body, req.user);
  return ApiResponse.success(res, 200, 'Lead converted successfully', result);
});

/**
 * Get lead timeline activity history
 */
const getLeadTimeline = asyncHandler(async (req, res) => {
  const timeline = await LeadService.getLeadTimeline(req.params.id, req.user);
  return ApiResponse.success(res, 200, 'Lead timeline retrieved successfully', timeline);
});

module.exports = {
  listLeads,
  createLead,
  getLeadById,
  updateLead,
  assignLead,
  updateStatus,
  addNote,
  convertLead,
  getLeadTimeline
};
