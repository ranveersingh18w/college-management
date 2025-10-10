import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import {
  MessageSquare,
  X,
  Send,
  Bot,
  User,
} from "lucide-react";
import { motion } from "motion/react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hi! I'm your Smart Campus Assistant. I can help you with schedules, events, campus resources, and bus bookings. What would you like to know?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInputValue("");

    // Simulate bot response
    setTimeout(() => {
      const botResponse = generateBotResponse(inputValue);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 500);
  };

  const generateBotResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();

    // Schedule queries
    if (
      lowerQuery.includes("next class") ||
      lowerQuery.includes("schedule")
    ) {
      return "Your next class is Artificial Intelligence at 9:00 AM in Lab 301 with Dr. Sarah Chen.";
    }
    if (
      lowerQuery.includes("timetable") ||
      lowerQuery.includes("today")
    ) {
      return "Today you have 3 classes: AI at 9:00 AM (Lab 301), Mathematics at 11:30 AM (Room 205), and Digital Electronics at 2:30 PM (Lab 102).";
    }

    // Event queries
    if (lowerQuery.includes("event")) {
      return "Upcoming events: TechFest 2025 (Oct 15), Robotics Workshop (Oct 12), Cultural Night (Oct 20), and Cricket Tournament (Oct 18). Would you like to register for any?";
    }
    if (lowerQuery.includes("techfest")) {
      return "TechFest 2025 is our annual technical festival on Oct 15 at the Main Auditorium. It features hackathons, robotics competitions, and tech talks. Would you like to register?";
    }

    // Campus resources queries
    if (lowerQuery.includes("library")) {
      return "The Main Library is located in Block A, Ground Floor. It's open from 8:00 AM to 8:00 PM. Contact: +1 234-567-8900";
    }
    if (
      lowerQuery.includes("cafeteria") ||
      lowerQuery.includes("canteen")
    ) {
      return "The Student Cafeteria is in Block C, Ground Floor. Opening hours: 7:00 AM - 9:00 PM. They serve breakfast, lunch, and snacks throughout the day.";
    }
    if (
      lowerQuery.includes("computer lab") ||
      lowerQuery.includes("lab")
    ) {
      return "The Computer Lab is located in Block B, 3rd Floor. It has 100+ workstations with high-speed internet. Open from 9:00 AM to 6:00 PM.";
    }

    // Bus queries
    if (
      lowerQuery.includes("bus") ||
      lowerQuery.includes("seat")
    ) {
      return "Available bus routes: Route A at 7:30 AM (15 seats left), Route B at 8:00 AM (12 seats left). Evening buses depart at 5:00 PM and 5:30 PM. Would you like to book a seat?";
    }

    // Default response
    return "I can help you with:\n• Class schedules and timetables\n• Campus events and registration\n• Finding campus resources\n• Bus seat reservations\n\nWhat would you like to know more about?";
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <Button
            onClick={() => setIsOpen(true)}
            size="lg"
            className="size-14 rounded-full shadow-2xl bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <MessageSquare className="size-6" />
          </Button>
        </motion.div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="fixed bottom-6 right-6 z-50 w-full max-w-md"
        >
          <Card className="flex flex-col h-[600px] shadow-2xl border-blue-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Bot className="size-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white">AI Assistant</h3>
                  <div className="flex items-center gap-1">
                    <div className="size-2 rounded-full bg-green-400 animate-pulse"></div>
                    <p className="text-xs text-white/90">
                      Online
                    </p>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-slate-50 to-white">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${
                      message.sender === "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    {message.sender === "bot" && (
                      <div className="size-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
                        <Bot className="size-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${
                        message.sender === "user"
                          ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white"
                          : "bg-white text-foreground border border-blue-100"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-line">
                        {message.text}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          message.sender === "user"
                            ? "text-blue-100"
                            : "text-muted-foreground"
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString(
                          [],
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </p>
                    </div>
                    {message.sender === "user" && (
                      <div className="size-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                        <User className="size-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t bg-white">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask me anything..."
                  value={inputValue}
                  onChange={(e) =>
                    setInputValue(e.target.value)
                  }
                  onKeyPress={(e) =>
                    e.key === "Enter" && handleSendMessage()
                  }
                  className="border-blue-200 focus:border-blue-400 bg-slate-50"
                />
                <Button
                  onClick={handleSendMessage}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </>
  );
}