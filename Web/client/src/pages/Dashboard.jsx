import { useState, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import StatsCard from "../components/StatsCard";
import TransactionHistory from "../components/TransactionHistory";
import { LoadingDisplay } from "../components/LoadingDisplay";
import EmptyState from "../components/events/EmptyState";
import { getEvents } from "../api/eventApi";
import { USER_PROFILE_CONTEXT } from "@/context";
import { useNavigate } from "react-router-dom";
import { getAuth } from "@/lib/util";

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { userProfile } = useContext(USER_PROFILE_CONTEXT);
  const { accessToken } = getAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["events"],
    queryFn: getEvents,
    onError: (error) => {
      console.error("Error fetching events:", error);
      toast.error(error.message || "Failed to fetch events");
    },
  });

  console.log("Dashboard data:", data); // Debug log

  // Ensure events is always an array
  const events = data?.events || [];

  // Transform events into transaction format with proper date handling
  const transactions = events.map((event) => ({
    event_id: event.event_id,
    event_name: event.event_name,
    city: event.city,
    state: event.state,
    start_date: event.start_date,
    payment_status: event.payment_status?.toLowerCase() || "pending",
    delivery_status: event.delivery_status?.toLowerCase() || "pending",
  }));

  // Filter transactions based on search
  const filteredTransactions = transactions.filter(
    (transaction) =>
      transaction.event_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.event_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.payment_status
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      transaction.delivery_status
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  if (error) {
    return (
      <div className="mx-auto max-w-4xl text-center p-4 sm:p-6">
        <h2 className="mb-4 font-bold text-xl sm:text-2xl text-gray-900">
          Unable to load dashboard
        </h2>
        <p className="mb-4 text-sm sm:text-base text-gray-600">
          {error.message || "Please try again later"}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-gold hover:bg-gold/90 px-4 py-2 rounded text-white text-sm sm:text-base"
        >
          Retry
        </button>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingDisplay message="Loading dashboard..." />;
  }

  // Redirect if no auth token or user profile
  if (!accessToken) {
    navigate("/login");
    return null;
  }

  if (!userProfile) {
    return <LoadingDisplay message="Loading user profile..." />;
  }

  // Calculate total stats with safeguards
  const totalAmount = userProfile.total_amount_spent;

  const totalEvents = events.length;

  return (
    <div className="p-3 sm:p-6">
      <div className="gap-4 sm:gap-6 grid grid-cols-2 md:grid-cols-2 mb-6 sm:mb-8 text-left">
        <StatsCard
          label="Total Transaction Amount"
          value={`₦${totalAmount.toLocaleString()}`}
          status="Host"
        />
        <StatsCard label="Total Events Hosted" value={totalEvents.toString()} />
      </div>

      <section className="space-y-4 sm:space-y-6">
        <h2 className="font-playfair font-semibold text-lg sm:text-xl">
          Transaction History
        </h2>
        {events.length === 0 ? (
          <EmptyState type="ongoing" />
        ) : (
          <TransactionHistory
            transactions={filteredTransactions}
            onSearch={setSearchTerm}
          />
        )}
      </section>
    </div>
  );
}
