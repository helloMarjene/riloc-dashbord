'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, RotateCcw, Save, UserCircle, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Badge, Button, Card, Field } from '@/components/ui';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function ProfilePage() {
  const { profile, avatarUrl, updateProfile, setAvatar, resetProfile } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(profile.name);
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setName(profile.name), [profile.name]);

  const pickFile = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    const validExt = /\.(jpe?g|png|webp|gif|svg)$/i.test(file.name);
    if (!validTypes.includes(file.type) && !validExt) {
      toast(`Unsupported file type “${file.type || file.name}”. Use a JPEG, PNG, WEBP, GIF or SVG image.`, 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('Image is larger than 5 MB. Choose a smaller file.', 'error');
      return;
    }
    setPendingFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const save = async () => {
    if (!name.trim()) {
      toast('Name cannot be empty.', 'error');
      return;
    }
    if (name.trim() !== profile.name) updateProfile({ name: name.trim() });
    if (pendingFile) {
      await setAvatar(pendingFile);
      setPendingFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
    }
    toast('Profile saved. It is now used across the whole dashboard.', 'success');
  };

  const cancel = () => {
    setName(profile.name);
    setPendingFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  };

  return (
    <div className="grid-2">
      <Card title="Administrator Profile">
        <div className="profile-head" style={{ marginBottom: 18 }}>
          <img src={preview ?? avatarUrl} alt="Profile" className="profile-avatar-lg" />
          <div className="stack-sm">
            <Badge tone="accent">{profile.role}</Badge>
            <Button size="sm" variant="secondary" icon={<Camera size={14} />} onClick={() => fileRef.current?.click()}>
              Change Profile Picture
            </Button>
            {preview && (
              <Button size="sm" variant="ghost" icon={<X size={14} />} onClick={cancel}>
                Cancel new picture
              </Button>
            )}
            <p className="muted">JPEG, PNG, WEBP, GIF or SVG · max 5 MB</p>
          </div>
        </div>
        <div className="stack-sm">
          <Field label="Administrator name">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Contact email" hint="This is the sign-in email. Change it in Settings → Security.">
            <input className="input" value={profile.email} disabled />
          </Field>
          <div className="row">
            <Button size="sm" icon={<Save size={14} />} onClick={() => void save()}>
              Save Profile
            </Button>
            <Button size="sm" variant="secondary" onClick={cancel}>
              Cancel
            </Button>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
          hidden
          onChange={(e) => {
            pickFile(e.target.files);
            e.target.value = '';
          }}
        />
      </Card>

      <div className="stack">
        <Card title="Live Preview">
          <p className="muted" style={{ marginBottom: 12 }}>
            This is how the administrator appears in the sidebar and the top-right menu right now:
          </p>
          <div className="row" style={{ gap: 14 }}>
            <img src={preview ?? avatarUrl} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
            <div>
              <strong>{name || profile.name}</strong>
              <p className="muted">{profile.role}</p>
            </div>
          </div>
        </Card>

        <Card title="Danger Zone">
          <div className="stack-sm">
            <p>Restore the default profile (ARSENE KAHUNGA, default picture) and forget any custom picture.</p>
            <Button size="sm" variant="danger" icon={<RotateCcw size={14} />} onClick={() => setConfirmReset(true)}>
              Reset to Defaults
            </Button>
          </div>
        </Card>

        <div className="notice notice-info">
          <UserCircle size={16} />
          <p>
            Profile data is stored in this browser only (IndexedDB for the picture, localStorage for the name). It is
            not synchronized between devices and does not survive clearing browser storage.
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset administrator profile?"
        message="The name returns to ARSENE KAHUNGA and the custom profile picture is removed. This cannot be undone."
        confirmLabel="Reset profile"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          resetProfile();
          cancel();
          toast('Profile reset to defaults.', 'info');
        }}
      />
    </div>
  );
}
