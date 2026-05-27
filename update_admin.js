const fs = require('fs');
const path = 'app/admin/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Añadir importación de ImageCropper
content = content.replace(
  'import { SuccessMessage } from "@/components/ui/SuccessMessage";',
  'import { SuccessMessage } from "@/components/ui/SuccessMessage";\nimport { ImageCropper } from "@/components/ui/ImageCropper";'
);

// Añadir estados para el cropper
content = content.replace(
  'const [error, setError] = useState("");',
  'const [error, setError] = useState("");\n  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);'
);

// Actualizar handleLogoUpload
const newHandleLogoUpload = `
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("El logo no debe superar los 2MB");
        setTimeout(() => setError(""), 3000);
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
    if (parkingLot) {
      setParkingLot({ ...parkingLot, logo_url: croppedImageBase64 });
    }
    setCropImageSrc(null);
  };
`;

content = content.replace(
  /const handleLogoUpload = \[\s\S]*?reader\.readAsDataURL\(file\);\s*\}\s*\};/,
  newHandleLogoUpload
);

// Esto es en caso de que el anterior regex fallara
if (!content.includes('handleCropComplete')) {
    content = content.replace(
      /const handleLogoUpload = \(e: React.ChangeEvent<HTMLInputElement>\) => \{[\s\S]*?reader\.readAsDataURL\(file\);\s*\}\s*\};/,
      newHandleLogoUpload
    );
}


// Añadir ImageCropper al render
content = content.replace(
  '{success && <SuccessMessage message={success} />}',
  '{success && <SuccessMessage message={success} />}\n\n          {cropImageSrc && (\n            <ImageCropper\n              imageSrc={cropImageSrc}\n              onCropComplete={handleCropComplete}\n              onCancel={() => setCropImageSrc(null)}\n            />\n          )}'
);

fs.writeFileSync(path, content);
