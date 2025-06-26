import { useEffect, useState } from "react";
import axios from "axios";

function AddAttributeSet() {
  const [allAttributes, setAllAttributes] = useState([]);
  const [selectedAttributes, setSelectedAttributes] = useState([]);
  const [setName, setSetName] = useState("");

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/attributes")
      .then((res) => setAllAttributes(res.data))
      .catch((err) => console.error("Error fetching attributes", err));
  }, []);

  const handleToggle = (id) => {
    if (selectedAttributes.includes(id)) {
      setSelectedAttributes(
        selectedAttributes.filter((attrId) => attrId !== id)
      );
    } else {
      setSelectedAttributes([...selectedAttributes, id]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!setName.trim() || selectedAttributes.length === 0) {
      return alert("Set name and at least one attribute are required.");
    }

    try {
      const res = await axios.post("http://localhost:5000/api/attribute-sets", {
        name: setName,
        attributeIds: selectedAttributes,
      });
      alert("Attribute Set Created: " + res.data.name);
      setSetName("");
      setSelectedAttributes([]);
    } catch (err) {
      console.error(err);
      alert("Error creating attribute set");
    }
  };

  return (
    <div>
      <h2>Create Attribute Set</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Set Name (e.g., Gold)"
          value={setName}
          onChange={(e) => setSetName(e.target.value)}
          required
        />

        <h4>Select Attributes:</h4>
        {allAttributes.map((attr) => (
          <div key={attr._id}>
            <label>
              <input
                type="checkbox"
                checked={selectedAttributes.includes(attr._id)}
                onChange={() => handleToggle(attr._id)}
              />
              {attr.label} ({attr.type})
            </label>
          </div>
        ))}

        <button type="submit">Create Attribute Set</button>
      </form>
    </div>
  );
}

export default AddAttributeSet;
