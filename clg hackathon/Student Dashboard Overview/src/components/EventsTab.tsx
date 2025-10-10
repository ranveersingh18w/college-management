import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Calendar, MapPin, Users, Plus, Filter } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  category: "technical" | "cultural" | "sports";
  description: string;
  attendees: number;
  image: string;
  registered: boolean;
}

export default function EventsTab() {
  const [events, setEvents] = useState<Event[]>([
    {
      id: "1",
      title: "TechFest 2025",
      date: "Oct 15, 2025",
      time: "9:00 AM - 6:00 PM",
      location: "Main Auditorium",
      category: "technical",
      description: "Annual technical festival featuring hackathons, robotics competitions, and tech talks.",
      attendees: 250,
      image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
      registered: false,
    },
    {
      id: "2",
      title: "Robotics Workshop",
      date: "Oct 12, 2025",
      time: "2:00 PM - 5:00 PM",
      location: "Lab 301",
      category: "technical",
      description: "Hands-on workshop on building autonomous robots with Arduino and sensors.",
      attendees: 45,
      image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800",
      registered: true,
    },
    {
      id: "3",
      title: "Cultural Night",
      date: "Oct 20, 2025",
      time: "6:00 PM - 10:00 PM",
      location: "Open Ground",
      category: "cultural",
      description: "An evening of music, dance, and cultural performances by students.",
      attendees: 500,
      image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800",
      registered: false,
    },
    {
      id: "4",
      title: "Inter-College Cricket Tournament",
      date: "Oct 18, 2025",
      time: "8:00 AM - 5:00 PM",
      location: "Sports Complex",
      category: "sports",
      description: "Annual cricket tournament with teams from 8 colleges competing for the championship.",
      attendees: 180,
      image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800",
      registered: false,
    },
  ]);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const toggleRegistration = (id: string) => {
    setEvents(
      events.map((event) =>
        event.id === id ? { ...event, registered: !event.registered } : event
      )
    );
  };

  const filteredEvents = selectedCategory === "all" 
    ? events 
    : events.filter(event => event.category === selectedCategory);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "technical":
        return "bg-blue-500";
      case "cultural":
        return "bg-purple-500";
      case "sports":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-blue-900">Campus Events</h2>
          <p className="text-muted-foreground">Discover and register for upcoming events</p>
        </div>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm">
          <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">All Events</TabsTrigger>
          <TabsTrigger value="technical" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Technical</TabsTrigger>
          <TabsTrigger value="cultural" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">Cultural</TabsTrigger>
          <TabsTrigger value="sports" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">Sports</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid md:grid-cols-2 gap-6">
        {filteredEvents.map((event) => (
          <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow border-blue-100">
            <div className="relative h-48">
              <ImageWithFallback
                src={event.image}
                alt={event.title}
                className="w-full h-full object-cover"
              />
              <div className={`absolute top-3 left-3 px-3 py-1 rounded-full ${getCategoryColor(event.category)} text-white capitalize text-sm shadow-lg`}>
                {event.category}
              </div>
            </div>
            <CardHeader>
              <CardTitle className="text-blue-900">{event.title}</CardTitle>
              <CardDescription className="line-clamp-2">{event.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="size-4 text-blue-600" />
                  <span>{event.date} • {event.time}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-4 text-blue-600" />
                  <span>{event.location}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="size-4 text-blue-600" />
                  <span>{event.attendees} registered</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant={event.registered ? "outline" : "default"}
                  className={`flex-1 ${event.registered ? 'border-green-500 text-green-700 hover:bg-green-50' : ''}`}
                  onClick={() => toggleRegistration(event.id)}
                >
                  {event.registered ? "Registered ✓" : "Register Now"}
                </Button>
                <Button variant="outline" className="border-blue-200 hover:bg-blue-50">
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <Card className="border-blue-100">
          <CardContent className="pt-6 text-center py-12">
            <Calendar className="size-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No events found in this category.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}