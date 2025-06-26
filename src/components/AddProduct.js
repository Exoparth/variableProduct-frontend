import { useEffect, useState } from "react";
import axios from "axios";

function AddProduct() {
  const [attributeSets, setAttributeSets] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState("");
  const [selectedSetAttributes, setSelectedSetAttributes] = useState([]);
  const [productName, setProductName] = useState("");
  const [sku, setSku] = useState("");
  const [attributeValues, setAttributeValues] = useState({});
  const [variantPrices, setVariantPrices] = useState([]);
  const [variantImages, setVariantImages] = useState([]);

  function generateCombinations(optionAttrs, valuesMap) {
    // Filter out attributes with no selected values
    const validOptionAttrs = optionAttrs.filter(
      (attr) => valuesMap[attr._id] && valuesMap[attr._id].length > 0
    );

    // If no valid options, return empty array
    if (validOptionAttrs.length === 0) return [];

    // Get the selected values for each attribute
    const selectedValues = validOptionAttrs.map((attr) =>
      (valuesMap[attr._id] || []).map((value) => ({
        attrId: attr._id,
        label: attr.label,
        value,
      }))
    );

    // Cartesian product function
    const cartesian = (...arrays) => {
      return arrays
        .reduce(
          (acc, curr) => acc.flatMap((x) => curr.map((y) => [...x, y])),
          [[]]
        )
        .filter((combo) => combo.length > 0);
    };

    // Generate all combinations
    const combinations = cartesian(...selectedValues);
    return combinations.map((combo) => ({
      combo, // This will be an array of {attrId, label, value} objects
      price: 0, // Initialize price
    }));
  }

  useEffect(() => {
    if (!Array.isArray(selectedSetAttributes)) return;

    const optionAttrs = selectedSetAttributes.filter(
      (attr) => attr.type === "options"
    );

    // Create a values map only for option attributes
    const optionValuesMap = optionAttrs.reduce((acc, attr) => {
      acc[attr._id] = attributeValues[attr._id] || [];
      return acc;
    }, {});

    const combos = generateCombinations(optionAttrs, optionValuesMap);

    setVariantPrices((prev) => {
      // Preserve existing prices when possible
      return combos.map((newCombo) => {
        // Create a unique key for this combination
        const comboKey = newCombo.combo
          .map((c) => `${c.attrId}:${c.value}`)
          .join("|");

        // Find matching existing variant
        const existing = prev.find(
          (v) =>
            v.combo &&
            v.combo.map((c) => `${c.attrId}:${c.value}`).join("|") === comboKey
        );

        return existing || newCombo;
      });
    });
    setVariantImages(combos.map(() => []));
  }, [attributeValues, selectedSetAttributes]);

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/attribute-sets")
      .then((res) => setAttributeSets(res.data))
      .catch((err) => console.error(err));
  }, []);

  const handleSetChange = (e) => {
    const setId = e.target.value;
    setSelectedSetId(setId);
    const selectedSet = attributeSets.find((set) => set._id === setId);
    if (!selectedSet) {
      setSelectedSetAttributes([]);
      return;
    }
    setSelectedSetAttributes(selectedSet.attributes || []);
    setAttributeValues({});
    setVariantPrices([]);
  };

  const handleAttributeChange = (attrId, value) => {
    setAttributeValues((prev) => ({
      ...prev,
      [attrId]: value,
    }));
  };

  const handleMultiSelect = (attrId, value) => {
    const existing = attributeValues[attrId] || []; // Changed from attr._id to attrId
    if (existing.includes(value)) {
      handleAttributeChange(
        attrId,
        existing.filter((v) => v !== value)
      );
    } else {
      handleAttributeChange(attrId, [...existing, value]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Prepare variants with prices
      const variants = variantPrices.map((variant, i) => {
        // Ensure combo is always an array
        const combo = Array.isArray(variant.combo) ? variant.combo : [];

        return {
          sku: `${sku}-${i + 1}`,
          price: variant.price || 0,
          images: variantImages[i] || [],
          attributes: [
            ...combo.map(({ label, value }) => ({ label, value })),
            ...selectedSetAttributes
              .filter((attr) => attr.type !== "options")
              .map((attr) => ({
                label: attr.label,
                value: attributeValues[attr._id],
              })),
          ],
        };
      });

      const res = await axios.post("http://localhost:5000/api/products", {
        name: productName,
        sku,
        attributeSetId: selectedSetId,
        variants,
      });

      alert(`Created ${variants.length} product variants successfully!`);

      // Reset form
      setProductName("");
      setSku("");
      setSelectedSetId("");
      setSelectedSetAttributes([]);
      setAttributeValues({});
      setVariantPrices([]);
      setVariantImages([]);
    } catch (err) {
      console.error(err);
      alert("Error creating product: " + err.message);
    }
  };

  const handleVariantImages = async (index, files) => {
    if (files.length > 5) {
      alert("Maximum 5 images per variant allowed");
      return;
    }

    const formData = new FormData();
    for (let f of files) {
      formData.append("images", f);
    }

    try {
      const res = await axios.post(
        "http://localhost:5000/api/upload/variant-images",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const uploaded = res.data.imagePaths;
      const updated = [...variantImages];
      updated[index] = uploaded;
      setVariantImages(updated);
    } catch (err) {
      console.error(err);
      alert("Image upload failed");
    }
  };

  return (
    <div>
      <h2>Create Product</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="SKU"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Product Name"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          required
        />

        <select value={selectedSetId} onChange={handleSetChange} required>
          <option value="">Select Attribute Set</option>
          {attributeSets.map((set) => (
            <option key={set._id} value={set._id}>
              {set.name}
            </option>
          ))}
        </select>

        {selectedSetAttributes.map((attr) =>
          attr && attr._id && attr.label ? (
            <div key={attr._id}>
              <label>
                {attr.label} ({attr.type})
              </label>
              <br />

              {attr.type === "string" || attr.type === "number" ? (
                <input
                  type={attr.type === "number" ? "number" : "text"}
                  value={attributeValues[attr._id] || ""}
                  onChange={(e) =>
                    handleAttributeChange(attr._id, e.target.value)
                  }
                />
              ) : attr.type === "boolean" ? (
                <input
                  type="checkbox"
                  checked={attributeValues[attr._id] || false}
                  onChange={(e) =>
                    handleAttributeChange(attr._id, e.target.checked)
                  }
                />
              ) : attr.type === "options" ? (
                <div>
                  {attr.options.map((opt, i) => (
                    <label key={i} style={{ marginRight: "10px" }}>
                      <input
                        type="checkbox"
                        checked={(attributeValues[attr._id] || []).includes(
                          opt
                        )}
                        onChange={() => handleMultiSelect(attr._id, opt)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null
        )}

        {variantPrices.length > 0 && (
          <div>
            <h4>Variant Details:</h4>
            {variantPrices.map((variant, i) => {
              // Safely get the combo array
              const combo = Array.isArray(variant.combo) ? variant.combo : [];

              return (
                <div
                  key={i}
                  style={{
                    marginBottom: "20px",
                    padding: "15px",
                    border: "1px solid #ddd",
                    borderRadius: "5px",
                    display: "flex",
                    gap: "20px",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <strong>
                      Variant {i + 1}:{" "}
                      {combo.map((c, idx) => (
                        <span key={idx}>
                          {c.label}: {c.value}
                          {idx < combo.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </strong>
                    <div style={{ marginTop: "10px" }}>
                      <label>Price:</label>
                      <input
                        type="number"
                        value={variant.price || 0}
                        onChange={(e) => {
                          const updated = [...variantPrices];
                          updated[i].price = parseFloat(e.target.value) || 0;
                          setVariantPrices(updated);
                        }}
                        placeholder="Price"
                        required
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <label>Images (max 5):</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleVariantImages(i, e.target.files)}
                      style={{ marginBottom: "10px", width: "100%" }}
                    />
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "10px",
                      }}
                    >
                      {(variantImages[i] || []).map((img, idx) => (
                        <div
                          key={idx}
                          style={{
                            width: "60px",
                            height: "60px",
                            overflow: "hidden",
                            borderRadius: "4px",
                            position: "relative",
                          }}
                        >
                          <img
                            src={
                              typeof img === "string"
                                ? img
                                : URL.createObjectURL(img)
                            }
                            alt={`Variant ${i + 1} image ${idx + 1}`}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <br />
        <button type="submit">Create Product</button>
      </form>
    </div>
  );
}

export default AddProduct;
