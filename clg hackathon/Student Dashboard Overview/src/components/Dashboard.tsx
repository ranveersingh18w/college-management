import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Bell, MessageSquare, Calendar, Bus, Lightbulb } from "lucide-react";

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const student = {
    name: "Alex Johnson",
    id: "CS2023045",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
  };

  const todayClasses = [
    { subject: "Artificial Intelligence", time: "9:00 AM", room: "Lab 301" },
    { subject: "Mathematics", time: "11:30 AM", room: "Room 205" },
    { subject: "Digital Electronics", time: "2:30 PM", room: "Lab 102" },
  ];

  const reminders = [
    { text: "Bus leaves in 20 mins", type: "urgent" },
    { text: "AI Lab at 2:30 PM", type: "info" },
    { text: "Submit Math assignment by 5 PM", type: "warning" },
  ];

  const attendancePercentage = 85;
  const motivationalTip = "Tip: Revise Boolean Algebra before class today! 📚";

  return (
    <div className="space-y-6">
      {/* Student Profile Card */}
      <Card className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 text-white border-0 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <CardContent className="pt-6 relative">
          <div className="flex items-center gap-4">
            <Avatar className="size-20 border-4 border-white/30 shadow-lg">
              <AvatarImage src={student.avatar} alt={student.name} />
              <AvatarFallback>AJ</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="mb-1 text-white">{student.name}</h2>
              <p className="text-white/90">Student ID: {student.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card className="shadow-sm border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Calendar className="size-5 text-blue-600" />
              Today's Schedule
            </CardTitle>
            <CardDescription>You have {todayClasses.length} classes today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayClasses.map((cls, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div>
                  <p className="text-sm">{cls.subject}</p>
                  <p className="text-xs text-muted-foreground">{cls.room}</p>
                </div>
                <Badge variant="outline" className="bg-white border-blue-200 text-blue-700">{cls.time}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Attendance & Reminders */}
        <div className="space-y-6">
          {/* Attendance Card */}
          <Card className="shadow-sm border-blue-100">
            <CardHeader>
              <CardTitle className="text-blue-900">Attendance Overview</CardTitle>
              <CardDescription>Overall attendance percentage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-2xl text-blue-600">{attendancePercentage}%</span>
                  <Badge variant={attendancePercentage >= 75 ? "default" : "destructive"} className={attendancePercentage >= 75 ? "bg-green-600" : ""}>
                    {attendancePercentage >= 75 ? "Good" : "Low"}
                  </Badge>
                </div>
                <Progress value={attendancePercentage} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Reminders */}
          <Card className="shadow-sm border-blue-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Bell className="size-5 text-blue-600" />
                Reminders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {reminders.map((reminder, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-xl text-sm border ${
                    reminder.type === "urgent"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : reminder.type === "warning"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}
                >
                  {reminder.text}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Motivational Message */}
      <Card className="bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50 border-purple-200 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="bg-gradient-to-br from-purple-500 to-fuchsia-500 p-2 rounded-lg">
              <Lightbulb className="size-5 text-white" />
            </div>
            <div>
              <p className="text-purple-900">{motivationalTip}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="shadow-sm border-blue-100">
        <CardHeader>
          <CardTitle className="text-blue-900">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-3">
            <Button variant="outline" className="h-auto py-6 flex flex-col gap-2 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all" onClick={() => {}}>
              <MessageSquare className="size-6 text-blue-600" />
              Ask AI Assistant
            </Button>
            <Button variant="outline" className="h-auto py-6 flex flex-col gap-2 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all" onClick={() => onNavigate("events")}>
              <Calendar className="size-6 text-indigo-600" />
              View Events
            </Button>
            <Button variant="outline" className="h-auto py-6 flex flex-col gap-2 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all" onClick={() => onNavigate("bus")}>
              <Bus className="size-6 text-violet-600" />
              Book Bus Seat
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}