import { useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { auth } from '../firebase';

const CLOUD_NAME = 'dhf6uuftb';
const UPLOAD_PRESET = 'ml_default';

export function usePhotoUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCropWidget = (): Promise<string | null> => {
    return new Promise((resolve) => {
      const widget = (window as any).cloudinary.createUploadWidget(
        {
          cloudName: CLOUD_NAME,
          uploadPreset: UPLOAD_PRESET,
          sources: ['local', 'camera'],
          multiple: false,
          cropping: true,
          croppingAspectRatio: 1,
          croppingShowDimensions: false,
          showSkipCropButton: false,
          croppingCoordinatesMode: 'custom',
          // Fuerza crop circular en preview
          styles: {
            palette: {
              window: '#FFFFFF',
              windowBorder: '#E5E0D8',
              tabIcon: '#C8102E',
              menuIcons: '#2C2A29',
              textDark: '#2C2A29',
              textLight: '#FFFFFF',
              link: '#C8102E',
              action: '#C8102E',
              inactiveTabIcon: '#999',
              error: '#F44235',
              inProgress: '#0078FF',
              complete: '#20B832',
              sourceBg: '#F4F1EA',
            },
            fonts: {
              default: null,
              "'Playfair Display', serif": {
                url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap',
                active: true,
              },
            },
          },
          folder: 'truco-tracker/avatars',
          transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
        },
        (error: any, result: any) => {
          if (error) {
            resolve(null);
            return;
          }
          if (result?.event === 'success') {
            resolve(result.info.secure_url);
            widget.close();
          }
          if (result?.event === 'close') {
            resolve(null);
          }
        }
      );
      widget.open();
    });
  };

  const uploadPhoto = async () => {
    setError(null);

    // Cargar el script de Cloudinary si no está
    if (!(window as any).cloudinary) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://upload-widget.cloudinary.com/global/all.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('No se pudo cargar el widget'));
        document.head.appendChild(script);
      });
    }

    setUploading(true);
    try {
      const url = await openCropWidget();
      if (url && auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: url });
        // Forzar re-render recargando el usuario
        await auth.currentUser.reload();
      }
    } catch (err) {
      setError('Hubo un problema al subir la foto. Intentá de nuevo.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return { uploadPhoto, uploading, error };
}
