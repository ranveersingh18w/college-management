import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Calendar, Clock, MapPin, User, Plus, Trash2, CheckCircle } from "lucide-react";

interface ClassSchedule {
  id: string;
  subject: string;
  faculty: string;
  time: string;
  location: string;
  day: string;
  attended: boolean;
}

export default function ScheduleTab() {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([
    {
      id: "1",
      subject: "Artificial Intelligence",
      faculty: "Dr. Sarah Chen",
      time: "9:00 AM - 10:30 AM",
      location: "Lab 301",
      day: "Monday",
      attended: false,
    },
    {
      id: "2",
      subject: "Mathematics",
      faculty: "Prof. John Smith",
      time: "11:30 AM - 1:00 PM",
      location: "Room 205",
      day: "Monday",
      attended: true,
    },
    {
      id: "3",
      subject: "Digital Electronics",
      faculty: "Dr. Emily Brown",
      time: "2:30 PM - 4:00 PM",
      location: "Lab 102",
      day: "Monday",
      attended: false,
    },
  ]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newClass, setNewClass] = useState({
    subject: "",
    faculty: "",
    time: "",
    location: "",
    day: "Monday",
  });

  const handleAddClass = () => {
    if (newClass.subject && newClass.faculty && newClass.time && newClass.location) {
      const newSchedule: ClassSchedule = {
        id: Date.now().toString(),
        ...newClass,
        attended: false,
      };
      setSchedules([...schedules, newSchedule]);
      setNewClass({ subject: "", faculty: "", time: "", location: "", day: "Monday" });
      setIsAddDialogOpen(false);
    }
  };

  const handleDeleteClass = (id: string) => {
    setSchedules(schedules.filter((schedule) => schedule.id !== id));
  };

  const toggleAttendance = (id: string) => {
    setSchedules(
      schedules.map((schedule) =>
        schedule.id === id ? { ...schedule, attended: !schedule.attended } : schedule
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-blue-900">Schedule Management</h2>
          <p className="text-muted-foreground">Manage your classes and track attendance</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" />
              Add Class
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Class</DialogTitle>
              <DialogDescription>Fill in the details for your new class</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="subject">Subject Name</Label>
                <Input
                  id="subject"
                  placeholder="e.g., Artificial Intelligence"
                  value={newClass.subject}
                  onChange={(e) => setNewClass({ ...newClass, subject: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="faculty">Faculty Name</Label>
                <Input
                  id="faculty"
                  placeholder="e.g., Dr. Sarah Chen"
                  value={newClass.faculty}
                  onChange={(e) => setNewClass({ ...newClass, faculty: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  placeholder="e.g., 9:00 AM - 10:30 AM"
                  value={newClass.time}
                  onChange={(e) => setNewClass({ ...newClass, time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., Lab 301"
                  value={newClass.location}
                  onChange={(e) => setNewClass({ ...newClass, location: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="day">Day</Label>
                <Select value={newClass.day} onValueChange={(value) => setNewClass({ ...newClass, day: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monday">Monday</SelectItem>
                    <SelectItem value="Tuesday">Tuesday</SelectItem>
                    <SelectItem value="Wednesday">Wednesday</SelectItem>
                    <SelectItem value="Thursday">Thursday</SelectItem>
                    <SelectItem value="Friday">Friday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddClass} className="w-full">
                Add Class
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {schedules.map((schedule) => (
          <Card key={schedule.id} className="hover:shadow-lg transition-shadow border-blue-100">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-blue-900">{schedule.subject}</h3>
                    <Badge variant={schedule.attended ? "default" : "secondary"} className={schedule.attended ? "bg-green-600" : "bg-slate-200"}>
                      {schedule.day}
                    </Badge>
                  </div>
                  
                  <div className="grid sm:grid-cols-3 gap-3 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="size-4 text-blue-600" />
                      <span className="text-sm">{schedule.faculty}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-blue-600" />
                      <span className="text-sm">{schedule.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 text-blue-600" />
                      <span className="text-sm">{schedule.location}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant={schedule.attended ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleAttendance(schedule.id)}
                      className={schedule.attended ? "bg-green-600 hover:bg-green-700" : "border-blue-200 hover:bg-blue-50"}
                    >
                      <CheckCircle className="size-4 mr-2" />
                      {schedule.attended ? "Attended" : "Mark as Attended"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-blue-200 hover:bg-blue-50"
                    >
                      <Calendar className="size-4 mr-2" />
                      Set Reminder
                    </Button>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteClass(schedule.id)}
                  className="hover:bg-red-50"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {schedules.length === 0 && (
        <Card className="border-blue-100">
          <CardContent className="pt-6 text-center py-12">
            <Calendar className="size-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No classes scheduled yet. Add your first class to get started!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}