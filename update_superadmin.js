const fs = require('fs');
const path = 'app/superadmin/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Añadir importación de ImageCropper
content = content.replace(
  'import { SuccessMessage } from "@/components/ui/SuccessMessage";',
  'import { SuccessMessage } from "@/components/ui/SuccessMessage";\nimport { ImageCropper } from "@/components/ui/ImageCropper";'
);

// Añadir estado para el cropper en superadmin
content = content.replace(
  'const [error, setError] = useState("");',
  'const [error, setError] = useState("");\n  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);'
);

// Actualizar handleImageUpload (en lugar de handleLogoUpload aquí)
const newHandleImageUpload = `
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("La imagen es muy grande. Máximo 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedImageBase64: string) => {
    setAppSettings({ ...appSettings, logo_url: croppedImageBase64 });
    setCropImageSrc(null);
  };
`;

content = content.replace(
  /const handleImageUpload = \(e: React.ChangeEvent<HTMLInputElement>\) => \{[\s\S]*?reader\.readAsDataURL\(file\);\s*\}\s*\};/,
  newHandleImageUpload
);

// Añadir ImageCropper al render
content = content.replace(
  '{success && <SuccessMessage message={success} />}',
  '{success && <SuccessMessage message={success} />}\n\n          {cropImageSrc && (\n            <ImageCropper\n              imageSrc={cropImageSrc}\n              onCropComplete={handleCropComplete}\n              onCancel={() => setCropImageSrc(null)}\n            />\n          )}'
);

fs.writeFileSync(path, content);
