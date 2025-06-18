import { useState } from "react";
import { useAuthenticated } from "../lib/hooks";
import { LoadingDisplay } from "../components/LoadingDisplay";
import EventCard from "../components/events/EventCard";
import EventTabs from "../components/events/EventTabs";
import EmptyState from "../components/events/EmptyState";
import { useEffect } from "react";
import { getEvents, deleteEvent } from "@/api/eventApi";

// Create a skeleton loader component
const EventCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6 mb-3 sm:mb-4 animate-pulse">
    <div className="flex justify-between items-start">
      <div className="space-y-2 sm:space-y-3 flex-1">
        <div className="h-5 sm:h-6 bg-gray-200 rounded w-3/4"></div>
        <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/4"></div>
      </div>
      <div className="h-7 sm:h-8 w-20 sm:w-24 bg-gray-200 rounded"></div>
    </div>
    <div className="mt-3 sm:mt-4 flex gap-2 sm:gap-3">
      <div className="h-7 sm:h-8 w-20 sm:w-24 bg-gray-200 rounded"></div>
      <div className="h-7 sm:h-8 w-20 sm:w-24 bg-gray-200 rounded"></div>
    </div>
  </div>
);

export default function ManageEvent() {
  const [activeTab, setActiveTab] = useState("ongoing");
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const authenticated = useAuthenticated();

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      let events_fetched = await getEvents();
      console.log({ events_fetched });
      setEvents(events_fetched.events);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDeleteEvent = async (eventId) => {
    try {
      await deleteEvent(eventId);
      setEvents(events.filter((event) => event.event_id !== eventId));
      setDeleteModalOpen(false);
      setEventToDelete(null);
    } catch (error) {
      console.error("Error deleting event:", error);
      // You might want to show an error toast here
    }
  };

  const openDeleteModal = (event) => {
    setEventToDelete(event);
    setDeleteModalOpen(true);
  };

  if (!authenticated) {
    return <LoadingDisplay />;
  }

  // Filter events based on active tab
  const today = new Date();
  const filteredEvents = events.filter((event) => {
    const endDate = event.end_date ? new Date(event.end_date) : null;
    if (!endDate) return false;
    if (activeTab === "ongoing") {
      return endDate >= today;
    } else {
      return endDate < today;
    }
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <div>
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
        </div>
      );
    }

    if (filteredEvents.length === 0) {
      return <EmptyState type={activeTab} />;
    }

    return (
      <div>
        {filteredEvents.map((event) => (
          <EventCard
            key={event.event_id}
            event={{
              ...event,
              postal_code: String(event.postal_code || ""),
            }}
            onDelete={openDeleteModal}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white min-h-screen">
      <main className="p-3 sm:p-4 lg:p-6">
        <div className="mx-auto max-w-7xl">
          <EventTabs activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className="mt-4 sm:mt-5 lg:mt-6">{renderContent()}</div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && eventToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete Event
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the event "
              {eventToDelete.event_name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setEventToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteEvent(eventToDelete.event_id)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
