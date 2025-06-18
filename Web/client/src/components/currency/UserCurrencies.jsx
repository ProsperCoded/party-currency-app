import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getAllCurrencies, deleteCurrency } from "@/api/currencyApi";
import { getEvents, getEventById } from "@/api/eventApi";
import { LoadingDisplay } from "@/components/LoadingDisplay";
import { Download, Files, Edit, PlusCircle, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import {
  CurrencyImage,
  downloadCurrencyImage,
} from "@/components/ui/CurrencyImage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CurrencyCanvas } from "./CurrencyCanvas";

function getTemplateImage(denomination) {
  console.log("denomination", denomination);
  if (denomination === 200) return "/lovable-uploads/200-front-template.png";
  if (denomination === 500) return "/lovable-uploads/500-front-template.png";
  if (denomination === 1000) return "/lovable-uploads/1000-front-template.png";
  return "/lovable-uploads/200-front-template.png";
}
export function UserCurrencies() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [events, setEvents] = useState({});
  const [eventDetails, setEventDetails] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    templateId: null,
  });
  const [previewDialog, setPreviewDialog] = useState({
    open: false,
    template: null,
  });
  const [templateImages, setTemplateImages] = useState({});
  const [downloadingCurrency, setDownloadingCurrency] = useState(null);

  // Refs for each currency's front and back canvas
  const canvasRefs = useRef({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch currencies
        const currencyData = await getAllCurrencies();
        console.log("Templates data:", currencyData);

        // Fetch events to map event names
        const eventsData = await getEvents();
        const eventsMap = {};

        if (eventsData && eventsData.events) {
          eventsData.events.forEach((event) => {
            eventsMap[event.event_id] = event.event_name;
          });
        }

        setEvents(eventsMap);
        setTemplates(currencyData || []);

        // Fetch detailed event information for payment status
        const eventDetailsMap = {};
        if (currencyData && currencyData.length > 0) {
          const uniqueEventIds = [
            ...new Set(
              currencyData.map((template) => template.event_id).filter(Boolean)
            ),
          ];

          const eventDetailPromises = uniqueEventIds.map(async (eventId) => {
            try {
              const eventDetail = await getEventById(eventId);
              eventDetailsMap[eventId] = eventDetail;
            } catch (err) {
              console.error(
                `Error fetching event details for ${eventId}:`,
                err
              );
              // Set default values if we can't fetch event details
              eventDetailsMap[eventId] = { payment_status: "pending" };
            }
          });

          await Promise.all(eventDetailPromises);
        }

        setEventDetails(eventDetailsMap);

        // Download images for each template
        const imagesMap = {};
        console.log("downloading images", currencyData);
        if (currencyData && currencyData.length > 0) {
          const downloadPromises = currencyData.map(async (template) => {
            const denomination = template.denomination || "200";
            try {
              const frontImageUrl = await downloadCurrencyImage(
                template.front_image,
                denomination,
                "front"
              );
              const backImageUrl = await downloadCurrencyImage(
                template.back_image,
                denomination,
                "back"
              );
              imagesMap[template.currency_id] = {
                front: frontImageUrl,
                back: backImageUrl,
              };
              console.log("downloaded images", imagesMap);
            } catch (err) {
              console.error(
                `Error downloading images for template ${template.currency_id}:`,
                err
              );
            }
          });
          await Promise.all(downloadPromises);
        }
        setTemplateImages(imagesMap);
        setError(null);
      } catch (error) {
        console.error("Error fetching data:", error);
        if (error.message === "Session expired. Please login again.") {
          toast.error("Your session has expired. Please login again.");
          navigate("/login");
        } else {
          setError(error.message);
          toast.error("Failed to load templates. Please try again.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const getEventName = (eventId) => {
    if (!eventId || eventId === "no_event") return "No Event";
    return events[eventId] || "Unknown Event";
  };

  const isPaymentSuccessful = (eventId) => {
    if (!eventId || eventId === "no_event") return false;
    const eventDetail = eventDetails[eventId];
    const paymentStatus = eventDetail?.payment_status?.toLowerCase();
    return (
      paymentStatus === "successful" ||
      paymentStatus === "paid" ||
      paymentStatus === "completed"
    );
  };

  // Updated download handler for both sides
  const handleDownload = async (template) => {
    if (!isPaymentSuccessful(template.event_id)) {
      toast.error(
        "Payment required: Please complete payment for this event before downloading currencies."
      );
      return;
    }
    const currencyId = template.currency_id;
    const denomination = template.denomination || "200";
    const currencyName = template.currency_name || "Currency";
    const frontKey = `${currencyId}-front`;
    const backKey = `${currencyId}-back`;
    const frontRef = canvasRefs.current[frontKey];
    const backRef = canvasRefs.current[backKey];

    if (!frontRef?.isReady() || !backRef?.isReady()) {
      toast.error(
        "Currency images not ready for download. Please wait a moment and try again."
      );
      return;
    }
    setDownloadingCurrency(currencyId);
    try {
      const baseName = `${currencyName}-₦${denomination}`;
      // Download front
      const frontSuccess = frontRef.downloadImage(`${baseName}-front.png`);
      await new Promise((resolve) => setTimeout(resolve, 500));
      // Download back
      const backSuccess = backRef.downloadImage(`${baseName}-back.png`);
      if (frontSuccess && backSuccess) {
        toast.success("Both sides downloaded successfully!");
      } else {
        toast.error("Some images failed to download. Please try again.");
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("An error occurred while downloading. Please try again.");
    } finally {
      setDownloadingCurrency(null);
    }
  };

  const handleDelete = async (templateId) => {
    try {
      setIsLoading(true);
      await deleteCurrency(templateId);

      // Update templates list after deletion
      setTemplates(templates.filter((t) => t.currency_id !== templateId));

      toast.success("Template deleted successfully");
      setDeleteDialog({ open: false, templateId: null });
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (template) => {
    const denomination = template.denomination || "200";
    navigate(
      `/dashboard/customize?denomination=${denomination}&currencyId=${template.currency_id}`
    );
  };

  const handlePreview = (template) => {
    setPreviewDialog({ open: true, template });
  };

  if (isLoading) {
    return <LoadingDisplay message="Loading your saved templates..." />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Files className="w-16 h-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Unable to load templates
        </h3>
        <p className="text-gray-600 mb-6 max-w-sm">{error}</p>
        <Button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Files className="w-16 h-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No saved templates yet
        </h3>
        <p className="text-gray-600 mb-6 max-w-sm">
          Start by customizing a currency template from the available options.
        </p>
        <Button
          onClick={() => navigate("/templates")}
          className="inline-flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          Create Your First Template
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {templates.map((template) => {
          const denomination = template.denomination || "200";
          const templateImage = templateImages[template.currency_id];
          const currencyId = template.currency_id;
          // --- Add refs for front and back ---
          const frontKey = `${currencyId}-front`;
          const backKey = `${currencyId}-back`;
          console.log("currency image", templateImage, template);
          return (
            <div
              key={currencyId}
              className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl hover:border-bluePrimary/30 transition-all duration-300"
            >
              {/* Currency Image Section */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
                <div className="w-full relative aspect-[3/2]">
                  {/* Visible front canvas for preview */}
                  <CurrencyCanvas
                    ref={(ref) => {
                      if (ref) canvasRefs.current[frontKey] = ref;
                    }}
                    templateImage={getTemplateImage(denomination)}
                    texts={{
                      eventId: template.event_id,
                      currencyName: template.currency_name,
                      celebration: template.front_celebration_text,
                      dominationText: "200",
                    }}
                    side="front"
                    denomination={denomination}
                    portraitImage={templateImage?.front}
                  />
                  {/* Hidden back canvas for download only */}
                  <div
                    style={{
                      position: "absolute",
                      left: "-9999px",
                      top: 0,
                      width: 0,
                      height: 0,
                      overflow: "hidden",
                    }}
                  >
                    <CurrencyCanvas
                      ref={(ref) => {
                        if (ref) canvasRefs.current[backKey] = ref;
                      }}
                      templateImage={getTemplateImage(denomination)}
                      texts={{
                        eventId: template.event_id,
                        currencyName: template.currency_name,
                        celebration: template.back_celebration_text,
                        dominationText: "200",
                      }}
                      side="back"
                      denomination={denomination}
                      portraitImage={templateImage?.back}
                    />
                  </div>
                </div>

                {/* Denomination Badge */}
                <div className="absolute top-3 right-3">
                  <span className="bg-gradient-to-r from-gold to-yellow-500 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg">
                    ₦{denomination}
                  </span>
                </div>

                {/* Quick Action Buttons - Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handlePreview(template)}
                      className="bg-white/90 hover:bg-white border-0 shadow-lg backdrop-blur-sm"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDownload(template)}
                      disabled={!isPaymentSuccessful(template.event_id)}
                      className={`bg-white/90 hover:bg-white border-0 shadow-lg backdrop-blur-sm ${
                        !isPaymentSuccessful(template.event_id)
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                      title={
                        !isPaymentSuccessful(template.event_id)
                          ? "Payment required to download"
                          : "Download currency"
                      }
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-5">
                {/* Header */}
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-lg text-gray-900 leading-tight line-clamp-2 flex-1 text-left">
                      {template.currency_name || "Party Currency"}
                    </h3>
                  </div>

                  {/* Event and Date Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md max-w-fit">
                        {getEventName(template.event_id)}
                      </span>
                      {template.event_id && (
                        <span
                          className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${
                            isPaymentSuccessful(template.event_id)
                              ? "bg-green-50 text-green-700"
                              : "bg-yellow-50 text-yellow-700"
                          }`}
                        >
                          {isPaymentSuccessful(template.event_id)
                            ? "Paid"
                            : "Payment Pending"}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(template.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Celebration Text */}
                <div className="mb-5">
                  <p className="text-gray-600 text-sm leading-relaxed text-left">
                    &ldquo;
                    {template.front_celebration_text || "Celebration of Life"}
                    &rdquo;
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleEdit(template)}
                    className="flex-1 bg-bluePrimary hover:bg-bluePrimary/90 text-white"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setDeleteDialog({
                        open: true,
                        templateId: template.currency_id,
                      })
                    }
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this currency template? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, templateId: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDelete(deleteDialog.templateId)}
              disabled={isLoading}
            >
              {isLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialog.open}
        onOpenChange={(open) => setPreviewDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-[90vw] md:max-w-2xl max-h-[90vh] overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>

          {previewDialog.template && (
            <div className="space-y-4 overflow-y-auto">
              <div>
                <h3 className="font-medium mb-2">Front Side</h3>
                <div className="border rounded-lg overflow-hidden max-h-[300px] md:max-h-[400px] relative">
                  {templateImages[previewDialog.template.currency_id]?.front ? (
                    <div className="w-full relative overflow-hidden">
                      <CurrencyCanvas
                        templateImage={getTemplateImage(
                          previewDialog.template.denomination
                        )}
                        texts={{
                          eventId: previewDialog.template.event_id,
                          currencyName: previewDialog.template.currency_name,
                          celebration:
                            previewDialog.template.front_celebration_text,
                          dominationText:
                            previewDialog.template.denomination || "200",
                        }}
                        side="front"
                        denomination={
                          previewDialog.template.denomination || "200"
                        }
                        portraitImage={
                          templateImages[previewDialog.template.currency_id]
                            .front
                        }
                      />
                      {/* Mobile scroll overlay */}
                      <div
                        className="absolute inset-0 bg-transparent md:hidden"
                        style={{ touchAction: "pan-y pinch-zoom" }}
                      />
                    </div>
                  ) : (
                    <CurrencyImage
                      driveUrl={previewDialog.template.front_image}
                      alt="Front"
                      className="w-full h-auto"
                      denomination={
                        previewDialog.template.denomination || "200"
                      }
                      side="front"
                    />
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Back Side</h3>
                <div className="border rounded-lg overflow-hidden max-h-[300px] md:max-h-[400px] relative">
                  {templateImages[previewDialog.template.currency_id]?.back ? (
                    <div className="w-full relative overflow-hidden">
                      <CurrencyCanvas
                        templateImage={getTemplateImage(
                          previewDialog.template.denomination
                        )}
                        texts={{
                          eventId: previewDialog.template.event_id,
                          currencyName: previewDialog.template.currency_name,
                          celebration:
                            previewDialog.template.back_celebration_text,
                          dominationText:
                            previewDialog.template.denomination || "200",
                        }}
                        side="back"
                        denomination={
                          previewDialog.template.denomination || "200"
                        }
                        portraitImage={
                          templateImages[previewDialog.template.currency_id]
                            .back
                        }
                      />
                      {/* Mobile scroll overlay */}
                      <div
                        className="absolute inset-0 bg-transparent md:hidden"
                        style={{ touchAction: "pan-y pinch-zoom" }}
                      />
                    </div>
                  ) : (
                    <CurrencyImage
                      driveUrl={previewDialog.template.back_image}
                      alt="Back"
                      className="w-full h-auto"
                      denomination={
                        previewDialog.template.denomination || "200"
                      }
                      side="back"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Currency Name:</p>
                  <p>
                    {previewDialog.template.currency_name || "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Event:</p>
                  <p>{getEventName(previewDialog.template.event_id)}</p>
                </div>
                <div>
                  <p className="font-medium">Front Text:</p>
                  <p>
                    {previewDialog.template.front_celebration_text ||
                      "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Back Text:</p>
                  <p>
                    {previewDialog.template.back_celebration_text ||
                      "Not specified"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setPreviewDialog({ open: false, template: null })}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
