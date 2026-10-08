// VTT flood columns: Cesium's PerInstanceFlatColorAppearanceVS plus extrusion.
// Used by services/vttFloodPrimitive.js.
//
// Primitive rewrites the `color` input into a batch-table lookup
// (Primitive._updateColorAttribute) and generates czm_batchTable_extrusion from
// the per-instance `extrusion` attribute (createBatchTable), so per-cell colour
// and height change without rebuilding geometry. czm_computePosition() is
// relative to the eye, so adding a world-space offset is exact.
// `extrudeDirection` is the surface normal on cap and wall-top vertices and zero
// on wall-bottom vertices; `shade` darkens the walls towards the ground.

in vec3 position3DHigh;
in vec3 position3DLow;
in vec3 extrudeDirection;
in float shade;
in vec4 color;
in float batchId;

out vec4 v_color;

void main()
{
    vec4 p = czm_computePosition();
    p.xyz += extrudeDirection * czm_batchTable_extrusion(batchId);
    v_color = vec4(color.rgb * shade, color.a);
    gl_Position = czm_modelViewProjectionRelativeToEye * p;
}
