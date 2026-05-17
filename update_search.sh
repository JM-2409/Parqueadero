cat << 'PATCH' > update_search.patch
--- app/admin/PrivateParking.tsx
+++ app/admin/PrivateParking.tsx
@@ -478,6 +478,41 @@

   const handleSearchHistoryForPlate = async (fieldValue: string, fieldName: string) => {
     if (fieldValue.length >= 3) {
+        const plateUpper = fieldValue.toUpperCase();
+
+        // 1. Check in local active private spaces first
+        const activeSpace = spaces.find(space => {
+            const cf = space.custom_fields_data || {};
+            const spacePlate = cf[fieldName] || Object.values(cf).find(v => typeof v === 'string' && v.toUpperCase() === plateUpper);
+            return spacePlate && typeof spacePlate === 'string' && spacePlate.toUpperCase() === plateUpper;
+        });
+
+        let foundData: any = null;
+        let sourceMessage = "activos";
+
+        if (activeSpace) {
+            foundData = activeSpace.custom_fields_data || {};
+        }
+
+        // 2. Check in public vehicles if not found in active spaces
+        if (!foundData) {
+            const { data: vehicleData } = await supabase
+                .from("vehicles")
+                .select("*")
+                .eq("parking_lot_id", parkingLotId)
+                .eq("plate", plateUpper)
+                .eq("status", "active")
+                .order("entry_time", { ascending: false })
+                .limit(1)
+                .maybeSingle();
+
+            if (vehicleData) {
+                foundData = vehicleData.custom_fields_data || {};
+                sourceMessage = "vehículos activos";
+            }
+        }
+
+        // 3. Check in history if not found in active spaces or vehicles
+        if (!foundData) {
         // Since custom_fields_data is JSONB, we need to query if the value exists
         // Also fallback to "plate" column if the field happens to be named "Placa" or similar
         const { data: historyData } = await supabase
@@ -490,8 +525,13 @@
         .maybeSingle();

         if (historyData) {
-            const cf = historyData.custom_fields_data || {};
+            foundData = historyData.custom_fields_data || {};
+            sourceMessage = "del historial";
+        }
+        }
+
+        if (foundData) {
+            const cf = foundData;
             setCustomFieldsData(prev => {
                 // Solo autocompletar campos vacíos, no sobreescribir si ya tienen datos
                 const newData = { ...prev };
@@ -504,7 +544,7 @@
                 });

                 if (merged && !success) {
-                   setSuccess(`Se autocompletaron datos del historial para ${fieldValue.toUpperCase()}`);
+                   setSuccess(`Se autocompletaron datos ${sourceMessage} para ${fieldValue.toUpperCase()}`);
                    setTimeout(() => setSuccess(""), 3000);
                 }
                 return newData;
PATCH
patch app/admin/PrivateParking.tsx update_search.patch
