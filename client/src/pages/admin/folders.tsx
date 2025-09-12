import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import FolderAccessManagement from "@/components/folder-access-management";

interface AdminFoldersProps {
  currentUser?: { id: number; username: string; email: string; role: string } | null;
}

export default function AdminFolders({ }: AdminFoldersProps) {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-4">
          <Link href="/admin">
            <Button variant="outline" size="sm" className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Folder Access Management</h1>
            <p className="text-muted-foreground">Configure user permissions for data lake folders</p>
          </div>
        </div>
      </div>

      {/* Folder Access Management Component */}
      <Card>
        <CardHeader>
          <CardTitle>Folder Access Control</CardTitle>
          <CardDescription>
            Manage which folders each user can access in the data lake
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FolderAccessManagement />
        </CardContent>
      </Card>
    </div>
  );
}