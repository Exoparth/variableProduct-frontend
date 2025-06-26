import { useState } from 'react';
import axios from 'axios';

function AddAttribute() {
  const [label, setLabel] = useState('');
  const [type, setType] = useState('string');
  const [options, setOptions] = useState(['']); // For type "options"

  const handleAddOption = () => setOptions([...options, '']);
  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };
  const handleRemoveOption = (index) => {
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = { label, type };
    if (type === 'options') data.options = options.filter(opt => opt.trim() !== '');

    try {
      const res = await axios.post('http://localhost:5000/api/attributes', data);
      alert('Attribute created: ' + res.data.label);
      setLabel('');
      setType('string');
      setOptions(['']);
    } catch (err) {
      console.error(err);
      alert('Error creating attribute');
    }
  };

  return (
    <div>
      <h2>Create Attribute</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
        />

        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
          <option value="options">Options</option>
        </select>

        {type === 'options' && (
          <div>
            <label>Options:</label>
            {options.map((opt, idx) => (
              <div key={idx}>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  required
                />
                <button type="button" onClick={() => handleRemoveOption(idx)}>Remove</button>
              </div>
            ))}
            <button type="button" onClick={handleAddOption}>Add Option</button>
          </div>
        )}

        <button type="submit">Create Attribute</button>
      </form>
    </div>
  );
}

export default AddAttribute;
