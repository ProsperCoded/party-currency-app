import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  SlidersHorizontal,
  AlertCircle,
  Package,
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  Mail,
  UserCircle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import adminApi from "@/api/adminApi";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";
import EventCard from "@/components/events/EventCard";

// Main Component
export default function EventManagement() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [confirmationDialog, setConfirmationDialog] = useState({
    open: false,
    eventId: null,
    newStatus: null,
  });

  // Pagination and filters
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("-created_at");
  const pageSize = 20;

  // State for delivery status changes
  const [selectedStatuses, setSelectedStatuses] = useState({});
  const [showUpdateButtons, setShowUpdateButtons] = useState({});

  // State for expanded admin sections
  const [expandedAdminSections, setExpandedAdminSections] = useState({});

  // State for user info dialog
  const [userInfoDialog, setUserInfoDialog] = useState({
    open: false,
    loading: false,
    user: null,
    error: null,
  });

  // State for client-side filtering
  const [allEvents, setAllEvents] = useState([]);

  // State for status filtering
  const [selectedStatusFilters, setSelectedStatusFilters] = useState([]);

  // Delivery status options
  const deliveryStatusOptions = [
    {
      value: "pending",
      label: "Pending",
      color: "bg-yellow-50 text-yellow-700 border-yellow-200",
    },
    {
      value: "delivered",
      label: "Delivered",
      color: "bg-green-50 text-green-700 border-green-200",
    },
    {
      value: "cancelled",
      label: "Cancelled",
      color: "bg-red-50 text-red-700 border-red-200",
    },
    {
      value: "pending_payment",
      label: "Pending Payment",
      color: "bg-orange-50 text-orange-700 border-orange-200",
    },
  ];

  // Fetch events
  const fetchEvents = async (
    page = currentPage,
    search = searchTerm, // eslint-disable-line no-unused-vars
    sort = sortBy
  ) => {
    try {
      setLoading(true);
      setError(null);
      // Temporarily disable search parameter due to backend 'title' field error
      const response = await adminApi.getEvents(page, pageSize, "", sort);

      // Transform events to ensure postal_code is a string
      const transformedEvents = (response.events || []).map((event) => ({
        ...event,
        postal_code: event.postal_code ? String(event.postal_code) : "",
      }));

      setAllEvents(transformedEvents);
      setEvents(transformedEvents);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.error || err.message || "Failed to fetch events");
      console.error("Error fetching events:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchEvents();
  }, []);

  // Client-side search function
  const performClientSearch = (searchValue) => {
    let filtered = allEvents;

    // Apply text search filter
    if (searchValue.trim()) {
      filtered = filtered.filter(
        (event) =>
          event.event_name?.toLowerCase().includes(searchValue.toLowerCase()) ||
          event.event_description
            ?.toLowerCase()
            .includes(searchValue.toLowerCase()) ||
          event.event_author
            ?.toLowerCase()
            .includes(searchValue.toLowerCase()) ||
          event.city?.toLowerCase().includes(searchValue.toLowerCase()) ||
          event.state?.toLowerCase().includes(searchValue.toLowerCase()) ||
          event.street_address
            ?.toLowerCase()
            .includes(searchValue.toLowerCase())
      );
    }

    // Apply status filter
    if (selectedStatusFilters.length > 0) {
      filtered = filtered.filter((event) =>
        selectedStatusFilters.includes(event.delivery_status)
      );
    }

    setEvents(filtered);
  };

  // Handle search
  const handleSearch = (value) => {
    setSearchTerm(value);
    // Use client-side search instead of backend search
    performClientSearch(value);
  };

  // Handle sort change
  const handleSortChange = (value) => {
    setSortBy(value);
    setCurrentPage(1);
    fetchEvents(1, searchTerm, value);
  };

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchEvents(page, searchTerm, sortBy);
  };

  // Handle admin section toggle
  const toggleAdminSection = (eventId) => {
    setExpandedAdminSections((prev) => ({
      ...prev,
      [eventId]: !prev[eventId],
    }));
  };

  // Handle status selection change
  const handleStatusSelection = (eventId, newStatus, currentStatus) => {
    setSelectedStatuses((prev) => ({
      ...prev,
      [eventId]: newStatus,
    }));

    // Show update button if status is different from current
    setShowUpdateButtons((prev) => ({
      ...prev,
      [eventId]: newStatus !== currentStatus,
    }));
  };

  // Handle status update confirmation
  const handleStatusUpdateClick = (eventId, newStatus) => {
    setConfirmationDialog({
      open: true,
      eventId,
      newStatus,
    });
  };

  // Handle status update
  const handleStatusUpdate = async (eventId, newStatus) => {
    setUpdatingStatus(true);
    try {
      await adminApi.changeDeliveryStatus(eventId, newStatus);
      // Update the local state
      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.event_id === eventId
            ? { ...event, delivery_status: newStatus }
            : event
        )
      );

      // Hide the update button
      setShowUpdateButtons((prev) => ({
        ...prev,
        [eventId]: false,
      }));

      toast.success("Delivery status updated successfully");
    } catch (error) {
      toast.error("Failed to update delivery status");
      throw error;
    } finally {
      setUpdatingStatus(false);
      setConfirmationDialog({ open: false, eventId: null, newStatus: null });
    }
  };

  // Handle user info dialog
  const handleViewUserInfo = async (userEmail) => {
    setUserInfoDialog({
      open: true,
      loading: true,
      user: null,
      error: null,
    });

    try {
      const response = await adminApi.getUserByEmail(userEmail);
      setUserInfoDialog({
        open: true,
        loading: false,
        user: response.user,
        error: null,
      });
    } catch (error) {
      setUserInfoDialog({
        open: true,
        loading: false,
        user: null,
        error: error.message || "Failed to fetch user information",
      });
    }
  };

  const closeUserInfoDialog = () => {
    setUserInfoDialog({
      open: false,
      loading: false,
      user: null,
      error: null,
    });
  };

  // Get status color helper
  const getStatusColor = (status) => {
    return (
      deliveryStatusOptions.find((opt) => opt.value === status)?.color ||
      "bg-gray-50 text-gray-700 border-gray-200"
    );
  };

  // Handle status filter toggle
  const handleStatusFilterToggle = (status) => {
    const newFilters = selectedStatusFilters.includes(status)
      ? selectedStatusFilters.filter((s) => s !== status)
      : [...selectedStatusFilters, status];

    setSelectedStatusFilters(newFilters);

    // Apply filters with current search term
    let filtered = allEvents;

    // Apply text search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (event) =>
          event.event_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.event_description
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          event.event_author
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          event.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.state?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.street_address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (newFilters.length > 0) {
      filtered = filtered.filter((event) =>
        newFilters.includes(event.delivery_status)
      );
    }

    setEvents(filtered);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSelectedStatusFilters([]);
    setSearchTerm("");
    setEvents(allEvents);
  };

  // Get count for each status
  const getStatusCount = (status) => {
    return allEvents.filter((event) => event.delivery_status === status).length;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4">
          <div>
            <h1 className="text-xl text-left sm:text-2xl font-semibold font-playfair text-gray-900">
              Event Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage event deliveries and author information
            </p>
          </div>
          {pagination && (
            <div className="bg-bluePrimary/10 px-3 py-1.5 rounded-lg border border-bluePrimary/20">
              <span className="text-sm font-medium text-bluePrimary">
                {pagination.total_count} total events
              </span>
            </div>
          )}
        </div>

        {/* Filters and Search */}
        <Card className="p-3 sm:p-4 border-bluePrimary/20 shadow-sm">
          <div className="relative">
            <Search className="absolute text-sm top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10 left-2  " />
            <Input
              type="text"
              placeholder="Search events (name, description, author, location)..."
              className="pl-10 pr-12 h-9 border-gray-200 focus:border-bluePrimary focus:ring-bluePrimary/20"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-8 h-7 border-0 bg-transparent hover:bg-gray-100 p-0 focus:ring-0 focus:ring-offset-0">
                  <SlidersHorizontal className="w-4 h-4 text-gray-500" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="-created_at">Newest First</SelectItem>
                  <SelectItem value="created_at">Oldest First</SelectItem>
                  <SelectItem value="event_name">Name A-Z</SelectItem>
                  <SelectItem value="-event_name">Name Z-A</SelectItem>
                  <SelectItem value="start_date">Start Date (Early)</SelectItem>
                  <SelectItem value="-start_date">Start Date (Late)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Status Filter Tags */}
        <Card className="p-3 sm:p-4 border-bluePrimary/20 shadow-sm bg-gradient-to-r from-bluePrimary/5 to-gold/5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-sm font-medium text-gray-700 flex-shrink-0">
              Filter by Status:
            </span>
            <div className="flex flex-wrap gap-2">
              {deliveryStatusOptions.map((option) => {
                const count = getStatusCount(option.value);
                const isSelected = selectedStatusFilters.includes(option.value);

                return (
                  <button
                    key={option.value}
                    onClick={() => handleStatusFilterToggle(option.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 hover:scale-105",
                      isSelected
                        ? option.color +
                            " ring-2 ring-offset-1 ring-current shadow-md"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:shadow-sm"
                    )}
                  >
                    {option.label}
                    <span
                      className={cn(
                        "ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold",
                        isSelected
                          ? "bg-white/80 text-current"
                          : "bg-gray-100 text-gray-500"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            {(selectedStatusFilters.length > 0 || searchTerm) && (
              <Button
                onClick={handleClearFilters}
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs border-red-200 text-red-600 hover:bg-red-50 flex-shrink-0"
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Active Filters Summary */}
          {(selectedStatusFilters.length > 0 || searchTerm) && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                <span className="font-medium">Active filters:</span>
                {searchTerm && (
                  <span className="px-2 py-1 bg-bluePrimary/10 text-bluePrimary rounded-full">
                    Search: "{searchTerm}"
                  </span>
                )}
                {selectedStatusFilters.map((status) => {
                  const option = deliveryStatusOptions.find(
                    (opt) => opt.value === status
                  );
                  return (
                    <span
                      key={status}
                      className={cn(
                        "px-2 py-1 rounded-full",
                        option?.color || "bg-gray-100 text-gray-700"
                      )}
                    >
                      {option?.label || status}
                    </span>
                  );
                })}
                <span className="text-gray-500">
                  • Showing {events.length} of {allEvents.length} events
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Events List */}
        {loading ? (
          <div className="flex justify-center items-center py-8 sm:py-12">
            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-bluePrimary"></div>
            <span className="ml-2 sm:ml-3 text-sm sm:text-base text-gray-600">
              Loading events...
            </span>
          </div>
        ) : error ? (
          <Card className="p-6 sm:p-8 text-center border-red-200 bg-red-50">
            <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-500 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
              Error Loading Events
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
              {error}
            </p>
            <Button
              onClick={() => fetchEvents()}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              Try Again
            </Button>
          </Card>
        ) : events.length === 0 ? (
          <Card className="p- bg-white sm:p-8 text-center border-gray-200">
            <Package className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
              No Events Found
            </h3>
            <p className="text-sm sm:text-base text-gray-600">
              {searchTerm
                ? "No events match your search criteria."
                : "No events have been created yet."}
            </p>
          </Card>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {events.map((event) => (
              <div
                key={event.event_id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                <EventCard
                  event={event}
                  type="admin"
                  onAdminToggle={toggleAdminSection}
                  isAdminExpanded={
                    expandedAdminSections[event.event_id] || false
                  }
                />

                {/* Collapsible Admin Controls */}
                {expandedAdminSections[event.event_id] && (
                  <div className="bg-gradient-to-r from-bluePrimary/5 to-gold/5 border-t border-gray-100 animate-in slide-in-from-top duration-200">
                    <div className="p-3 sm:p-4">
                      {/* Author Info */}
                      <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 mb-3">
                        <div className="flex items-start gap-2 min-w-0">
                          <div className="p-1.5 bg-bluePrimary/10 rounded-lg">
                            <UserCircle className="w-3.5 h-3.5 text-bluePrimary" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs text-gray-500 block text-left">
                              Author
                            </span>
                            <span className="text-sm font-medium text-gray-900 truncate block text-left">
                              {event.event_author}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-end sm:ml-auto">
                          <Button
                            onClick={() =>
                              handleViewUserInfo(event.event_author)
                            }
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 px-2 border-bluePrimary/30 text-bluePrimary hover:bg-bluePrimary/10 flex-shrink-0"
                          >
                            <User className="w-3 h-3 mr-1" />
                            View Info
                          </Button>
                        </div>
                      </div>

                      {/* Status Section */}
                      <div className="space-y-3">
                        {/* Current Status */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 font-medium">
                            Current Status:
                          </span>
                          <span
                            className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium border",
                              getStatusColor(event.delivery_status)
                            )}
                          >
                            {deliveryStatusOptions.find(
                              (opt) => opt.value === event.delivery_status
                            )?.label || event.delivery_status}
                          </span>
                        </div>

                        {/* Status Update */}
                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-xs text-gray-500 font-medium flex-shrink-0 self-start">
                              Change to:
                            </span>
                            <Select
                              value={
                                selectedStatuses[event.event_id] ||
                                event.delivery_status
                              }
                              onValueChange={(value) =>
                                handleStatusSelection(
                                  event.event_id,
                                  value,
                                  event.delivery_status
                                )
                              }
                            >
                              <SelectTrigger className="h-7 text-xs border-gray-200 focus:border-bluePrimary">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {deliveryStatusOptions.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                    className="text-xs"
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {showUpdateButtons[event.event_id] && (
                            <Button
                              onClick={() =>
                                handleStatusUpdateClick(
                                  event.event_id,
                                  selectedStatuses[event.event_id]
                                )
                              }
                              disabled={updatingStatus}
                              size="sm"
                              className="bg-gold hover:bg-gold/90 text-white h-7 px-3 text-xs flex-shrink-0"
                            >
                              {updatingStatus ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                  Updating...
                                </>
                              ) : (
                                "Update Status"
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <Card className="p-3 sm:p-4 border-bluePrimary/20 bg-gradient-to-r from-bluePrimary/5 to-gold/5">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
              <div className="text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
                Page {pagination.current_page} of {pagination.total_pages}
                <span className="hidden sm:inline">
                  {" "}
                  • {pagination.total_count} total events
                </span>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.current_page - 1)}
                  disabled={!pagination.has_previous}
                  className="h-8 px-2 sm:px-3 text-xs border-bluePrimary/30 text-bluePrimary hover:bg-bluePrimary/10"
                >
                  <ChevronLeft className="w-3 h-3 sm:mr-1" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from(
                    { length: Math.min(5, pagination.total_pages) },
                    (_, i) => {
                      let pageNum;
                      if (pagination.total_pages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.current_page <= 3) {
                        pageNum = i + 1;
                      } else if (
                        pagination.current_page >=
                        pagination.total_pages - 2
                      ) {
                        pageNum = pagination.total_pages - 4 + i;
                      } else {
                        pageNum = pagination.current_page - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={
                            pageNum === pagination.current_page
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className={cn(
                            "w-7 h-7 p-0 text-xs",
                            pageNum === pagination.current_page
                              ? "bg-bluePrimary hover:bg-bluePrimary/90"
                              : "border-bluePrimary/30 text-bluePrimary hover:bg-bluePrimary/10"
                          )}
                        >
                          {pageNum}
                        </Button>
                      );
                    }
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.current_page + 1)}
                  disabled={!pagination.has_next}
                  className="h-8 px-2 sm:px-3 text-xs border-bluePrimary/30 text-bluePrimary hover:bg-bluePrimary/10"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-3 h-3 sm:ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        )}
      </main>

      {/* User Info Dialog */}
      <Dialog open={userInfoDialog.open} onOpenChange={closeUserInfoDialog}>
        <DialogContent className="sm:max-w-md mx-3 sm:mx-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <div className="p-1.5 bg-bluePrimary/10 rounded-lg">
                <UserCircle className="w-4 h-4 text-bluePrimary" />
              </div>
              User Information
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-gray-600">
              Contact details for the event author
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4">
            {userInfoDialog.loading ? (
              <div className="flex justify-center items-center py-6 sm:py-8">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-bluePrimary"></div>
                <span className="ml-2 sm:ml-3 text-sm text-gray-600">
                  Loading user data...
                </span>
              </div>
            ) : userInfoDialog.error ? (
              <div className="text-center py-6 sm:py-8">
                <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-500 mx-auto mb-3 sm:mb-4" />
                <p className="text-red-600 font-medium text-sm">Error</p>
                <p className="text-gray-600 text-xs sm:text-sm">
                  {userInfoDialog.error}
                </p>
              </div>
            ) : userInfoDialog.user ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-bluePrimary/5 rounded-lg border border-bluePrimary/20">
                    <Mail className="w-4 h-4 text-bluePrimary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700">Email</p>
                      <p className="text-sm text-gray-900 truncate">
                        {userInfoDialog.user.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gold/5 rounded-lg border border-gold/20">
                    <User className="w-4 h-4 text-gold flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700">
                        Full Name
                      </p>
                      <p className="text-sm text-gray-900 truncate">
                        {userInfoDialog.user.first_name}{" "}
                        {userInfoDialog.user.last_name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <Phone className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700">
                        Phone Number
                      </p>
                      <p className="text-sm text-gray-900 truncate">
                        {userInfoDialog.user.phone_number || "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <UserCircle className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700">
                        User Type
                      </p>
                      <p className="text-sm text-gray-900 capitalize">
                        {userInfoDialog.user.type || "Standard"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <div className="flex gap-2">
                    <Button
                      onClick={() =>
                        window.open(`mailto:${userInfoDialog.user.email}`)
                      }
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-8 border-bluePrimary/30 text-bluePrimary hover:bg-bluePrimary/10"
                    >
                      <Mail className="w-3 h-3 mr-1" />
                      Email
                    </Button>
                    {userInfoDialog.user.phone_number && (
                      <Button
                        onClick={() =>
                          window.open(`tel:${userInfoDialog.user.phone_number}`)
                        }
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs h-8 border-gold/30 text-gold hover:bg-gold/10"
                      >
                        <Phone className="w-3 h-3 mr-1" />
                        Call
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Update Confirmation Dialog */}
      <Dialog
        open={confirmationDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmationDialog({
              open: false,
              eventId: null,
              newStatus: null,
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-md mx-3 sm:mx-0">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              Confirm Status Update
            </DialogTitle>
            <DialogDescription className="text-sm">
              Are you sure you want to change the delivery status to{" "}
              <span className="font-semibold text-bluePrimary">
                {deliveryStatusOptions.find(
                  (opt) => opt.value === confirmationDialog.newStatus
                )?.label || confirmationDialog.newStatus}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setConfirmationDialog({
                  open: false,
                  eventId: null,
                  newStatus: null,
                })
              }
              className="h-8 px-3 text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                handleStatusUpdate(
                  confirmationDialog.eventId,
                  confirmationDialog.newStatus
                )
              }
              disabled={updatingStatus}
              size="sm"
              className="bg-gold hover:bg-gold/90 text-white h-8 px-3 text-xs"
            >
              {updatingStatus ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                  Updating...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
