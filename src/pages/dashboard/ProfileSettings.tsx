"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useClerkSupabaseClient } from "../../integrations/supabase/client"
import { useUser } from '@clerk/clerk-react'
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Upload, Trash2 } from "lucide-react"
import { motion } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

export default function ProfileSettings() {
  const supabase = useClerkSupabaseClient()
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [removingAvatar, setRemovingAvatar] = useState(false)

  const [formData, setFormData] = useState({
    full_name: "",
    headline: "",
    bio: "",
    location: "",
    website: "",
    github: "",
    linkedin: "",
    twitter: "",
    avatar_url: "",
  })

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.fullName || '',
        headline: user.unsafeMetadata.headline as string || '',
        bio: user.unsafeMetadata.bio as string || '',
        location: user.unsafeMetadata.location as string || '',
        website: user.unsafeMetadata.website as string || '',
        github: user.unsafeMetadata.github as string || '',
        linkedin: user.unsafeMetadata.linkedin as string || '',
        twitter: user.unsafeMetadata.twitter as string || '',
        avatar_url: user.imageUrl || '',
      })
    }
  }, [user])

  useEffect(() => {
    if (!user || !supabase) return;
    async function ensureProfile() {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!data) {
        const { error: insertError } = await supabase.from('user_profiles').insert({
          id: user.id,
          full_name: user.fullName,
          avatar_url: user.imageUrl,
        });
        if (insertError) {
          console.error('Insert error:', insertError);
        }
      }
    }
    ensureProfile();
  }, [user, supabase]);

  // Show loading spinner if supabase client is not ready
  if (!supabase) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading profile settings...</p>
        </div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      // Check if profile exists first
      const { data: existingProfile } = await supabase.from("user_profiles").select("id").eq("id", user.id).single()

      let operation

      if (existingProfile) {
        // Update existing profile
        operation = supabase.from("user_profiles").update(formData).eq("id", user.id)
      } else {
        // Insert new profile
        operation = supabase.from("user_profiles").insert({ ...formData, id: user.id })
      }

      const { error } = await operation

      if (error) throw error
      toast.success("Profile updated successfully")
    } catch (error: any) {
      toast.error(error.message || "Error updating profile")
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploadingAvatar(true)
    try {
      // Create a unique file name
      const fileExt = file.name.split(".").pop()
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Upload the file to Supabase Storage
      const { error: uploadError } = await supabase.storage.from("portfolio").upload(filePath, file)

      if (uploadError) throw uploadError

      // Get the public URL
      const { data: publicUrlData } = supabase.storage.from("portfolio").getPublicUrl(filePath)

      // Update the profile with the new avatar URL
      const avatarUrl = publicUrlData.publicUrl

      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id)

      if (updateError) throw updateError

      // Update local state and refresh profile
      setFormData((prev) => ({ ...prev, avatar_url: avatarUrl }))
      toast.success("Profile picture updated successfully")
    } catch (error: any) {
      toast.error(error.message || "Error uploading avatar")
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleRemoveAvatar = async () => {
    if (!user) return
    setRemovingAvatar(true)
    try {
      // Remove avatar_url from profile
      const { error } = await supabase
        .from("user_profiles")
        .update({ avatar_url: "" })
        .eq("id", user.id)
      if (error) throw error
      setFormData((prev) => ({ ...prev, avatar_url: "" }))
      toast.success("Profile photo removed successfully")
      setShowRemoveDialog(false)
    } catch (error: any) {
      toast.error(error.message || "Error removing profile photo")
    } finally {
      setRemovingAvatar(false)
    }
  }

  return (
    <div className="space-y-4 mt-16 md:mt-0 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Profile Settings</h1>
      </div>
      <Card className="border border-gray-200 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg font-medium"></CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
              <motion.div
                className="flex flex-col items-center gap-2"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Avatar className="w-24 h-24 border-2 border-gray-200">
                  <AvatarImage src={formData.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback className="text-2xl bg-gray-100 text-gray-500">
                    {formData.full_name?.[0]?.toUpperCase() || user?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="relative flex flex-col gap-2 items-center mt-2">
                  <input
                    type="file"
                    id="avatar"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleAvatarChange}
                    disabled={uploadingAvatar}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-7 inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-full cursor-pointer"
                    onClick={() => document.getElementById('avatar')?.click()}
                    disabled={uploadingAvatar}
                    aria-label="Change profile photo"
                  >
                    {uploadingAvatar ? (
                      "Uploading..."
                    ) : (
                      <>
                        <Upload size={14} /> Change Photo
                      </>
                    )}
                  </Button>
                  {formData.avatar_url && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="h-7 rounded-full text-red-500 bg-red-50 hover:bg-red-100 px-3 text-xs mt-1"
                      title="Remove photo"
                      onClick={() => setShowRemoveDialog(true)}
                      disabled={uploadingAvatar || removingAvatar}
                      aria-label="Remove profile photo"
                    >
                      <Trash2 size={16} className="mr-1" /> Remove Photo
                    </Button>
                  )}
                </div>
              </motion.div>

              <div className="flex-1 w-full space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      className="border-gray-200 focus:border-black focus:ring-black"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="headline">Professional Title</Label>
                    <Input
                      id="headline"
                      name="headline"
                      value={formData.headline}
                      onChange={handleChange}
                      placeholder="Full Stack Developer"
                      className="border-gray-200 focus:border-black focus:ring-black"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Write a short bio about yourself..."
                    rows={4}
                    className="border-gray-200 focus:border-black focus:ring-black"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="San Francisco, CA"
                    className="border-gray-200 focus:border-black focus:ring-black"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Social Media & Links</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Personal Website</Label>
                  <Input
                    id="website"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://yourwebsite.com"
                    type="url"
                    className="border-gray-200 focus:border-black focus:ring-black"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="github">GitHub</Label>
                  <Input
                    id="github"
                    name="github"
                    value={formData.github}
                    onChange={handleChange}
                    placeholder="https://github.com/username"
                    type="url"
                    className="border-gray-200 focus:border-black focus:ring-black"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    name="linkedin"
                    value={formData.linkedin}
                    onChange={handleChange}
                    placeholder="https://linkedin.com/in/username"
                    type="url"
                    className="border-gray-200 focus:border-black focus:ring-black"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitter">Twitter</Label>
                  <Input
                    id="twitter"
                    name="twitter"
                    value={formData.twitter}
                    onChange={handleChange}
                    placeholder="https://twitter.com/username"
                    type="url"
                    className="border-gray-200 focus:border-black focus:ring-black"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="default" disabled={uploadingAvatar || loading} size="sm" className="rounded-full">
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Remove Photo Confirmation Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent className="max-w-xs p-6 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base">Remove Profile Photo?</DialogTitle>
            <DialogDescription>
              This will delete your current profile photo and revert to the default avatar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:space-x-2">
            <Button
              variant="destructive"
              className="h-7 rounded-full px-3 text-xs hover:bg-red-400 hover:text-gray-400 order-1 sm:order-2"
              onClick={handleRemoveAvatar}
              disabled={removingAvatar}
            >
              {removingAvatar ? "Removing..." : "Remove"}
            </Button>
            <Button
              variant="ghost"
              className="h-7 rounded-full px-3 text-xs hover:bg-muted order-2 sm:order-1"
              onClick={() => setShowRemoveDialog(false)}
              disabled={removingAvatar}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
