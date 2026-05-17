const fs = require('fs');
const content = fs.readFileSync('app/admin/PrivateParking.tsx', 'utf8');

const search = `  const handleSearchHistoryForPlate = async (fieldValue: string, fieldName: string) => {
    if (fieldValue.length >= 3) {
        // Since custom_fields_data is JSONB, we need to query if the value exists
        // Also fallback to "plate" column if the field happens to be named "Placa" or similar
        const { data: historyData } = await supabase
        .from("private_parking_history")
        .select("*")
        .eq("parking_lot_id", parkingLotId)
        .or(\`plate.eq.\${fieldValue.toUpperCase()},custom_fields_data->>\${fieldName}.ilike.\${fieldValue}\`)
        .order("released_at", { ascending: false })
        .limit(1)
        .maybeSingle();

        if (historyData) {
            const cf = historyData.custom_fields_data || {};
            setCustomFieldsData(prev => {
                // Solo autocompletar campos vacíos, no sobreescribir si ya tienen datos
                const newData = { ...prev };
                let merged = false;
                Object.keys(cf).forEach(k => {
                    if (!newData[k] && k !== fieldName) {
                        newData[k] = cf[k];
                        merged = true;
                    }
                });

                if (merged && !success) {
                   setSuccess(\`Se autocompletaron datos del historial para \${fieldValue.toUpperCase()}\`);
                   setTimeout(() => setSuccess(""), 3000);
                }
                return newData;
            });
        }
    }
  };`;

const replace = `  const handleSearchHistoryForPlate = async (fieldValue: string, fieldName: string) => {
    if (fieldValue.length >= 3) {
        const plateUpper = fieldValue.toUpperCase();
        let foundData: any = null;
        let sourceMessage = "activos";

        // 1. Check in local active private spaces first
        const activeSpace = spaces.find(space => {
            if (editingSpaceId && space.id === editingSpaceId) return false;
            const cf = space.custom_fields_data || {};
            const spacePlate = cf[fieldName] || (Object.keys(cf).find(k => k.toLowerCase() === 'placa') ? cf[Object.keys(cf).find(k => k.toLowerCase() === 'placa')!] : "");
            return spacePlate && typeof spacePlate === 'string' && spacePlate.toUpperCase() === plateUpper;
        });

        if (activeSpace) {
            foundData = activeSpace.custom_fields_data || {};
        }

        // 2. Check in public vehicles if not found in active spaces
        if (!foundData) {
            const { data: vehicleData } = await supabase
                .from("vehicles")
                .select("*")
                .eq("parking_lot_id", parkingLotId)
                .eq("plate", plateUpper)
                .eq("status", "active")
                .order("entry_time", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (vehicleData) {
                foundData = vehicleData.custom_fields_data || {};
                sourceMessage = "vehículos activos";
            }
        }

        // 3. Check in history if not found in active spaces or vehicles
        if (!foundData) {
            // Since custom_fields_data is JSONB, we need to query if the value exists
            // Also fallback to "plate" column if the field happens to be named "Placa" or similar
            const { data: historyData } = await supabase
            .from("private_parking_history")
            .select("*")
            .eq("parking_lot_id", parkingLotId)
            .or(\`plate.eq.\${plateUpper},custom_fields_data->>\${fieldName}.ilike.\${fieldValue}\`)
            .order("released_at", { ascending: false })
            .limit(1)
            .maybeSingle();

            if (historyData) {
                foundData = historyData.custom_fields_data || {};
                sourceMessage = "del historial";
            }
        }

        if (foundData) {
            const cf = foundData;
            setCustomFieldsData(prev => {
                // Solo autocompletar campos vacíos, no sobreescribir si ya tienen datos
                const newData = { ...prev };
                let merged = false;
                Object.keys(cf).forEach(k => {
                    if (!newData[k] && k !== fieldName) {
                        newData[k] = cf[k];
                        merged = true;
                    }
                });

                if (merged && !success) {
                   setSuccess(\`Se autocompletaron datos \${sourceMessage} para \${plateUpper}\`);
                   setTimeout(() => setSuccess(""), 3000);
                }
                return newData;
            });
        }
    }
  };`;

if(content.includes(search)) {
    fs.writeFileSync('app/admin/PrivateParking.tsx', content.replace(search, replace));
    console.log("Patched successfully");
} else {
    console.log("Could not find content to replace.");
}
