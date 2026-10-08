import { useState, type FormEvent } from "react";
import { GraduationCap, Save, Upload, X } from "lucide-react";
import type { ProfileData } from "../../types/workspace";
import { field, primary } from "../../constants/workspaceData";
import { PageTitle } from "../ui/PageTitle";
import { Avatar } from "../ui/Avatar";

export function Profile({
  profile,
  onboard = false,
  save,
}: {
  profile: ProfileData;
  onboard?: boolean;
  save: (profile: ProfileData) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState(profile);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function update(key: keyof ProfileData, value: string | string[]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await save(draft);
    } finally {
      setSaving(false);
    }
  }

  function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Please select an image smaller than 2 MB.");
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) update("photo", dataUrl);
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }

  return (
    <>
      <PageTitle
        label={onboard ? "RESEARCHER REGISTRATION" : "RESEARCHER PROFILE"}
        title={
          onboard
            ? "Researcher Profile Information"
            : "Researcher Profile & Curriculum"
        }
        description={
          onboard
            ? "Please complete your researcher information to enter the workspace directory."
            : "Your research profile is visible to team leads, admins, and fellow researchers."
        }
      />
      <form onSubmit={submit} className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-[24px] border border-[#e5e9ef] bg-white p-7 text-[#182d4c]">
          <div className="mb-6 flex items-center gap-5 border-b border-[#edf0f4] pb-6">
            <Avatar profile={draft} size="h-20 w-20" />
            <div>
              <h3 className="text-[15px] font-extrabold">Researcher Photo</h3>
              <p className="mt-1 text-[10px] text-[#7d8b9e]">
                Upload a clear profile picture (PNG or JPG, max 2MB).
              </p>
              <div className="mt-3 flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#f0f4f8] px-3.5 py-2 text-[10px] font-bold text-[#354c69] hover:bg-[#e4ecf3]">
                  <Upload size={13} />
                  {uploading ? "Uploading..." : "Upload photo"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                {draft.photo && (
                  <button
                    type="button"
                    onClick={() => update("photo", "")}
                    className="rounded-xl p-2 text-[#9da9b8] hover:bg-[#f3f5f8]"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-semibold">First Name</label>
              <input
                required
                value={draft.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                placeholder="e.g., Aditya"
                className={`${field} mt-1.5`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold">Last Name</label>
              <input
                required
                value={draft.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                placeholder="e.g., Kumar"
                className={`${field} mt-1.5`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold">Department</label>
              <input
                required
                value={draft.department}
                onChange={(e) => update("department", e.target.value)}
                placeholder="e.g., Aerospace Engineering"
                className={`${field} mt-1.5`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold">Roll Number / ID</label>
              <input
                required
                value={draft.roll}
                onChange={(e) => update("roll", e.target.value)}
                placeholder="Enter roll number / student ID"
                className={`${field} mt-1.5`}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-[11px] font-semibold">Phone Number</label>
            <input
              type="tel"
              value={draft.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="+91 98765 43210"
              className={`${field} mt-1.5`}
            />
          </div>

          <div className="mt-4">
            <label className="block text-[11px] font-semibold">Bio / Objective</label>
            <textarea
              rows={3}
              value={draft.bio}
              onChange={(e) => update("bio", e.target.value)}
              placeholder="Brief description of your research interests and technical background..."
              className={`${field} mt-1.5 resize-none`}
            />
          </div>

          <div className="mt-6 flex justify-end">
            <button disabled={saving} className={primary}>
              <Save size={14} />
              {saving ? "Saving..." : onboard ? "Save & enter workspace" : "Save profile"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
