import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Bus, Clock, MapPin, Users, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner@2.0.3";

interface BusRoute {
  id: string;
  routeName: string;
  time: string;
  departurePoint: string;
  destination: string;
  totalSeats: number;
  bookedSeats: number;
  stops: string[];
  type: "morning" | "evening";
}

export default function BusTab() {
  const [routes, setRoutes] = useState<BusRoute[]>([
    {
      id: "1",
      routeName: "Route A - City Center",
      time: "7:30 AM",
      departurePoint: "Main Gate",
      destination: "City Center Station",
      totalSeats: 50,
      bookedSeats: 35,
      stops: ["Main Gate", "East Campus", "Metro Station", "City Center"],
      type: "morning",
    },
    {
      id: "2",
      routeName: "Route B - North Campus",
      time: "8:00 AM",
      departurePoint: "Main Gate",
      destination: "North Campus",
      totalSeats: 40,
      bookedSeats: 28,
      stops: ["Main Gate", "Library", "Sports Complex", "North Campus"],
      type: "morning",
    },
    {
      id: "3",
      routeName: "Route A - Return",
      time: "5:00 PM",
      departurePoint: "City Center Station",
      destination: "Main Gate",
      totalSeats: 50,
      bookedSeats: 42,
      stops: ["City Center", "Metro Station", "East Campus", "Main Gate"],
      type: "evening",
    },
    {
      id: "4",
      routeName: "Route B - Return",
      time: "5:30 PM",
      departurePoint: "North Campus",
      destination: "Main Gate",
      totalSeats: 40,
      bookedSeats: 15,
      stops: ["North Campus", "Sports Complex", "Library", "Main Gate"],
      type: "evening",
    },
    {
      id: "5",
      routeName: "Route C - Airport",
      time: "6:00 AM",
      departurePoint: "Main Gate",
      destination: "Airport",
      totalSeats: 30,
      bookedSeats: 30,
      stops: ["Main Gate", "Highway Plaza", "Airport Terminal 1", "Airport Terminal 2"],
      type: "morning",
    },
  ]);

  const [bookedRoutes, setBookedRoutes] = useState<Set<string>>(new Set());

  const handleBookSeat = (routeId: string, routeName: string) => {
    const route = routes.find((r) => r.id === routeId);
    if (!route) return;

    if (route.bookedSeats >= route.totalSeats) {
      toast.error("No seats available", {
        description: "This bus is fully booked. Please try another route.",
      });
      return;
    }

    setRoutes(
      routes.map((r) =>
        r.id === routeId ? { ...r, bookedSeats: r.bookedSeats + 1 } : r
      )
    );
    setBookedRoutes(new Set([...bookedRoutes, routeId]));
    
    toast.success("Seat booked successfully!", {
      description: `Your seat on ${routeName} has been confirmed. Booking ID: #${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    });
  };

  const handleCancelBooking = (routeId: string, routeName: string) => {
    setRoutes(
      routes.map((r) =>
        r.id === routeId ? { ...r, bookedSeats: Math.max(0, r.bookedSeats - 1) } : r
      )
    );
    const newBookedRoutes = new Set(bookedRoutes);
    newBookedRoutes.delete(routeId);
    setBookedRoutes(newBookedRoutes);
    
    toast.success("Booking cancelled", {
      description: `Your booking for ${routeName} has been cancelled.`,
    });
  };

  const getAvailabilityStatus = (route: BusRoute) => {
    const available = route.totalSeats - route.bookedSeats;
    const percentage = (available / route.totalSeats) * 100;
    
    if (percentage === 0) return { status: "Full", variant: "destructive" as const };
    if (percentage <= 20) return { status: "Almost Full", variant: "secondary" as const };
    return { status: "Available", variant: "default" as const };
  };

  const RouteCard = ({ route }: { route: BusRoute }) => {
    const { status, variant } = getAvailabilityStatus(route);
    const availableSeats = route.totalSeats - route.bookedSeats;
    const isBooked = bookedRoutes.has(route.id);

    return (
      <Card className="hover:shadow-lg transition-shadow border-blue-100">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg">
                  <Bus className="size-5 text-white" />
                </div>
                {route.routeName}
              </CardTitle>
              <CardDescription className="mt-2">
                {route.departurePoint} → {route.destination}
              </CardDescription>
            </div>
            <Badge variant={variant} className={
              status === "Full" ? "bg-red-600" : 
              status === "Almost Full" ? "bg-amber-500" : 
              "bg-green-600"
            }>{status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4 text-blue-600" />
              <span>Departure: {route.time}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="size-4 text-blue-600" />
              <span>
                {availableSeats} seats available out of {route.totalSeats}
              </span>
            </div>
          </div>

          <div>
            <p className="text-sm mb-2">Stops:</p>
            <div className="flex flex-wrap gap-2">
              {route.stops.map((stop, index) => (
                <Badge key={index} variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                  {stop}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {isBooked ? (
              <Button
                variant="outline"
                className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                onClick={() => handleCancelBooking(route.id, route.routeName)}
              >
                <XCircle className="size-4 mr-2" />
                Cancel Booking
              </Button>
            ) : (
              <Button
                className="flex-1"
                onClick={() => handleBookSeat(route.id, route.routeName)}
                disabled={availableSeats === 0}
              >
                <CheckCircle className="size-4 mr-2" />
                {availableSeats === 0 ? "Fully Booked" : "Book Seat"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-blue-900">Bus Seat Reservation</h2>
        <p className="text-muted-foreground">Check availability and reserve your bus seat</p>
      </div>

      <Tabs defaultValue="morning">
        <TabsList className="grid w-full grid-cols-2 bg-white shadow-sm">
          <TabsTrigger value="morning" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Morning Buses</TabsTrigger>
          <TabsTrigger value="evening" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Evening Buses</TabsTrigger>
        </TabsList>

        <TabsContent value="morning" className="space-y-4 mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            {routes
              .filter((route) => route.type === "morning")
              .map((route) => (
                <RouteCard key={route.id} route={route} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="evening" className="space-y-4 mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            {routes
              .filter((route) => route.type === "evening")
              .map((route) => (
                <RouteCard key={route.id} route={route} />
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}