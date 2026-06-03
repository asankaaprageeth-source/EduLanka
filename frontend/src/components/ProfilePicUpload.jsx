import React, { useRef, useState } from 'react';
import {
  Avatar, Box, Button, CircularProgress, Typography,
} from '@mui/material';
import { CameraAlt, PhotoLibrary, CloudUpload } from '@mui/icons-material';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const API_ROOT = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api')
  .replace(/\/api\/?$/, '')
  .replace(/\/$/, '');

const ProfilePicUpload = ({ role }) => {
  const { user, updateUser } = useAuth();
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const galleryRef = useRef(null);
  const cameraRef = useRef(null);

  const currentPhotoUrl = user?.photo ? `${API_ROOT}/uploads/${user.photo}` : null;

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleCancel = () => {
    setPreview(null);
    setSelectedFile(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', selectedFile);

      const endpoint = role === 'teacher'
        ? '/teacher/profile/upload-pic'
        : '/student/profile/upload-pic';

      const res = await API.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      updateUser({ photo: res.data.photo });
      setPreview(null);
      setSelectedFile(null);
      toast.success('Profile picture updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const displaySrc = preview || currentPhotoUrl;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
      <Avatar
        src={displaySrc}
        sx={{ width: 100, height: 100, fontSize: 38, bgcolor: '#1976d2', border: '3px solid #e3f2fd' }}
      >
        {!displaySrc && user?.name?.[0]?.toUpperCase()}
      </Avatar>

      {preview && (
        <Typography variant="caption" color="text.secondary">
          Preview — tap Upload to save
        </Typography>
      )}

      {/* Hidden file inputs */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="user"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<PhotoLibrary fontSize="small" />}
          onClick={() => galleryRef.current?.click()}
          disabled={uploading}
        >
          Gallery
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<CameraAlt fontSize="small" />}
          onClick={() => cameraRef.current?.click()}
          disabled={uploading}
        >
          Selfie
        </Button>
      </Box>

      {preview && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant="text"
            color="inherit"
            onClick={handleCancel}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={
              uploading
                ? <CircularProgress size={14} color="inherit" />
                : <CloudUpload fontSize="small" />
            }
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default ProfilePicUpload;
