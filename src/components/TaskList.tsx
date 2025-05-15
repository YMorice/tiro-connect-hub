
import { useState } from 'react';
import { Task } from '@/types';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useProject } from "@/context/project-context";

interface TaskListProps {
  tasks: Task[];
  fetchProjectDetails: () => void;
}

const TaskList = ({ tasks, fetchProjectDetails }: TaskListProps) => {
  const { updateTask } = useProject();
  const [loading, setLoading] = useState<string | null>(null);

  const handleStatusChange = async (taskId: string, status: "todo" | "in_progress" | "done") => {
    try {
      setLoading(taskId);
      await updateTask(taskId, { status });
      fetchProjectDetails();
    } catch (error) {
      console.error("Error updating task:", error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {tasks.length > 0 ? (
        tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center justify-between p-4 rounded-lg bg-secondary/50"
          >
            <div className="flex items-center gap-2">
              <Checkbox
                id={`task-${task.id}`}
                checked={task.status === "done"}
                onCheckedChange={(checked) => {
                  const newStatus = checked ? "done" : "todo";
                  handleStatusChange(task.id, newStatus);
                }}
              />
              <div>
                <p className={task.status === "done" ? "line-through text-muted-foreground" : ""}>
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {task.status !== "done" && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading === task.id || task.status === "todo"}
                    onClick={() => handleStatusChange(task.id, "todo")}
                  >
                    Todo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading === task.id || task.status === "in_progress"}
                    onClick={() => handleStatusChange(task.id, "in_progress")}
                  >
                    In Progress
                  </Button>
                </>
              )}
            </div>
          </div>
        ))
      ) : (
        <p className="text-muted-foreground">No tasks found.</p>
      )}
    </div>
  );
};

export default TaskList;
