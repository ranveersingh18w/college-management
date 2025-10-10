import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Home, Calendar, PartyPopper, MapPin, Bus } from "lucide-react";
import Dashboard from "./components/Dashboard";
import ScheduleTab from "./components/ScheduleTab";
import EventsTab from "./components/EventsTab";
import ResourcesTab from "./components/ResourcesTab";
import BusTab from "./components/BusTab";
import ChatBot from "./components/ChatBot";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-2">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-2xl mr-3 shadow-lg">
              <Home className="size-8 text-white" />
            </div>
            <h1 className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Smart Campus Companion
            </h1>
          </div>
          <p className="text-center text-muted-foreground">Your all-in-one campus management solution</p>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex justify-center">
            <TabsList className="grid w-full max-w-2xl grid-cols-5 h-auto p-1 bg-white/80 backdrop-blur-sm shadow-sm">
              <TabsTrigger value="home" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Home className="size-4" />
                <span className="hidden sm:inline">Home</span>
              </TabsTrigger>
              <TabsTrigger value="schedule" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Calendar className="size-4" />
                <span className="hidden sm:inline">Schedule</span>
              </TabsTrigger>
              <TabsTrigger value="events" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <PartyPopper className="size-4" />
                <span className="hidden sm:inline">Events</span>
              </TabsTrigger>
              <TabsTrigger value="resources" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <MapPin className="size-4" />
                <span className="hidden sm:inline">Resources</span>
              </TabsTrigger>
              <TabsTrigger value="bus" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Bus className="size-4" />
                <span className="hidden sm:inline">Bus</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="home">
            <Dashboard onNavigate={setActiveTab} />
          </TabsContent>

          <TabsContent value="schedule">
            <ScheduleTab />
          </TabsContent>

          <TabsContent value="events">
            <EventsTab />
          </TabsContent>

          <TabsContent value="resources">
            <ResourcesTab />
          </TabsContent>

          <TabsContent value="bus">
            <BusTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating AI Chatbot */}
      <ChatBot />
      
      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}