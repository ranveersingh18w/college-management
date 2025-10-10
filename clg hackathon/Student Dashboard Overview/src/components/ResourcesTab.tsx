import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { MapPin, Clock, Phone, Search, ExternalLink } from "lucide-react";

interface Resource {
  id: string;
  name: string;
  location: string;
  floor: string;
  description: string;
  openingTime: string;
  closingTime: string;
  contact?: string;
  mapLink?: string;
  type: string;
}

export default function ResourcesTab() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const resources: Resource[] = [
    {
      id: "1",
      name: "Main Library",
      location: "Block A, Ground Floor",
      floor: "Ground Floor",
      description: "Central library with study halls, computer lab, and vast collection of books and journals.",
      openingTime: "8:00 AM",
      closingTime: "8:00 PM",
      contact: "+1 234-567-8900",
      mapLink: "#",
      type: "Academic",
    },
    {
      id: "2",
      name: "Computer Lab",
      location: "Block B, 3rd Floor",
      floor: "3rd Floor",
      description: "State-of-the-art computer lab with 100+ workstations and high-speed internet.",
      openingTime: "9:00 AM",
      closingTime: "6:00 PM",
      contact: "+1 234-567-8901",
      mapLink: "#",
      type: "Academic",
    },
    {
      id: "3",
      name: "Student Cafeteria",
      location: "Block C, Ground Floor",
      floor: "Ground Floor",
      description: "Main dining facility offering breakfast, lunch, and snacks throughout the day.",
      openingTime: "7:00 AM",
      closingTime: "9:00 PM",
      contact: "+1 234-567-8902",
      type: "Facility",
    },
    {
      id: "4",
      name: "AI Research Lab",
      location: "Block D, 3rd Floor, Room 301",
      floor: "3rd Floor",
      description: "Advanced AI and Machine Learning research facility with GPU workstations.",
      openingTime: "9:00 AM",
      closingTime: "5:00 PM",
      contact: "+1 234-567-8903",
      type: "Academic",
    },
    {
      id: "5",
      name: "Sports Complex",
      location: "Behind Main Campus",
      floor: "Ground Level",
      description: "Indoor and outdoor sports facilities including gym, basketball court, and cricket ground.",
      openingTime: "6:00 AM",
      closingTime: "8:00 PM",
      contact: "+1 234-567-8904",
      type: "Sports",
    },
    {
      id: "6",
      name: "Medical Center",
      location: "Block A, 1st Floor",
      floor: "1st Floor",
      description: "On-campus medical facility with doctors and nurses available for student health services.",
      openingTime: "8:00 AM",
      closingTime: "6:00 PM",
      contact: "+1 234-567-8905 (Emergency: 911)",
      type: "Facility",
    },
  ];

  const filteredResources = resources.filter((resource) =>
    resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    resource.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    resource.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Academic":
        return "default";
      case "Facility":
        return "secondary";
      case "Sports":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-blue-900">Campus Resources</h2>
        <p className="text-muted-foreground">Find locations and information about campus facilities</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-blue-600" />
        <Input
          placeholder="Search for library, cafeteria, labs, etc..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 border-blue-200 focus:border-blue-400 bg-white shadow-sm"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {filteredResources.map((resource) => (
          <Card key={resource.id} className="hover:shadow-lg transition-shadow border-blue-100">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-blue-900">{resource.name}</CardTitle>
                  <CardDescription className="mt-2">{resource.description}</CardDescription>
                </div>
                <Badge 
                  variant={getTypeColor(resource.type)}
                  className={
                    resource.type === "Academic" ? "bg-blue-600" :
                    resource.type === "Sports" ? "border-green-500 text-green-700" :
                    "bg-purple-100 text-purple-700 border-purple-200"
                  }
                >
                  {resource.type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="size-4 mt-0.5 flex-shrink-0 text-blue-600" />
                  <div>
                    <p>{resource.location}</p>
                    <p className="text-xs">Floor: {resource.floor}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-4 text-blue-600" />
                  <span>{resource.openingTime} - {resource.closingTime}</span>
                </div>
                {resource.contact && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="size-4 text-blue-600" />
                    <span>{resource.contact}</span>
                  </div>
                )}
              </div>
              
              {resource.mapLink && (
                <Button variant="outline" size="sm" className="w-full border-blue-200 hover:bg-blue-50 hover:border-blue-300">
                  <MapPin className="size-4 mr-2" />
                  View on Map
                  <ExternalLink className="size-3 ml-2" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredResources.length === 0 && (
        <Card className="border-blue-100">
          <CardContent className="pt-6 text-center py-12">
            <Search className="size-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No resources found matching "{searchQuery}"</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}