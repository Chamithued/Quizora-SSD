import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save, X, AlertCircle } from "lucide-react";
import { questionService } from "../../services/questionService";
import { ASSET_BASE_URL } from '../../services/apiConfig';

export default function QuestionForm({ question, module, onQuestionCreated }) {
  const [formData, setFormData] = useState({
    type: "MCQ",
    questionText: "",
    image: null,
    equations: [],
    mcqOptions: [
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ],
    answer: "",
    tags: "",
    difficulty: "Medium",
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [newEquation, setNewEquation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [isEditMode, setIsEditMode] = useState(false);

  const questionTypes = [
    { value: "MCQ", label: "Multiple Choice Question" },
    { value: "Structured", label: "Structured Question" },
    { value: "Essay", label: "Essay Question" },
  ];

  const difficultyLevels = [
    { value: "Easy", label: "Easy" },
    { value: "Medium", label: "Medium" },
    { value: "Hard", label: "Hard" },
  ];

  // Initialize form with existing question data if editing
  useEffect(() => {
    if (question) {
      setIsEditMode(true);
      setFormData({
        type: question.type || "MCQ",
        questionText: question.questionText || "",
        image: null, // Don't pre-populate file input
        equations: question.equations || [],
        mcqOptions:
          question.options?.length > 0
            ? question.options
            : [
                { text: "", isCorrect: false },
                { text: "", isCorrect: false },
              ],
        answer: question.answer || "",
        tags: question.tags ? question.tags.join(", ") : "",
        difficulty: question.difficulty || "Medium",
      });

      // Set existing image preview if available
      if (question.image) {
        setImagePreview(`${ASSET_BASE_URL}/uploads/${question.image}`);
      }
    } else {
      setIsEditMode(false);
      // Reset to default values for new question
      setFormData({
        type: "MCQ",
        questionText: "",
        image: null,
        equations: [],
        mcqOptions: [
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
        ],
        answer: "",
        tags: "",
        difficulty: "Medium",
      });
      setImagePreview(null);
    }
  }, [question]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field-specific errors when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        image: "Image size must be less than 5MB",
      }));
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({
        ...prev,
        image: "Please select a valid image file",
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, image: file }));
    setErrors((prev) => ({ ...prev, image: null }));

    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setFormData((prev) => ({ ...prev, image: null }));
    setImagePreview(null);
    setErrors((prev) => ({ ...prev, image: null }));

    // Clear file input
    const fileInput = document.getElementById("image-upload");
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const addMCQOption = () => {
    setFormData((prev) => ({
      ...prev,
      mcqOptions: [...prev.mcqOptions, { text: "", isCorrect: false }],
    }));
  };

  const updateMCQOption = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      mcqOptions: prev.mcqOptions.map((o, i) =>
        i === index ? { ...o, [field]: value } : o
      ),
    }));
    setErrors((prev) => ({ ...prev, mcqOptions: null }));
  };

  const removeMCQOption = (index) => {
    if (formData.mcqOptions.length <= 2) return;
    setFormData((prev) => ({
      ...prev,
      mcqOptions: prev.mcqOptions.filter((_, i) => i !== index),
    }));
  };

  const addEquation = () => {
    const eq = newEquation.trim();
    if (!eq) return;
    setFormData((prev) => ({ ...prev, equations: [...prev.equations, eq] }));
    setNewEquation("");
  };

  const removeEquation = (index) => {
    setFormData((prev) => ({
      ...prev,
      equations: prev.equations.filter((_, i) => i !== index),
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields validation
    if (!formData.questionText.trim()) {
      newErrors.questionText = "Question text is required";
    }

    // MCQ specific validation
    if (formData.type === "MCQ") {
      const validOptions = formData.mcqOptions.filter((o) => o.text.trim());
      if (validOptions.length < 2) {
        newErrors.mcqOptions = "Provide at least 2 options";
      } else if (!validOptions.some((o) => o.isCorrect)) {
        newErrors.mcqOptions = "Mark at least one correct answer";
      }
    } else {
      // Structured/Essay validation
      if (!formData.answer.trim()) {
        newErrors.answer = "Answer is required for Structured/Essay questions";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      type: "MCQ",
      questionText: "",
      image: null,
      equations: [],
      mcqOptions: [
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
      ],
      answer: "",
      tags: "",
      difficulty: "Medium",
    });
    setImagePreview(null);
    setNewEquation("");
    setErrors({});

    // Clear file input
    const fileInput = document.getElementById("image-upload");
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submitData = new FormData();
    submitData.append("type", formData.type);
    submitData.append("questionText", formData.questionText.trim());
    submitData.append("difficulty", formData.difficulty);

    // Use module information automatically
    submitData.append("moduleId", module._id);
    submitData.append("moduleCode", module.moduleCode);
    submitData.append("moduleYear", module.moduleYear.toString());
    submitData.append("moduleSemester", module.moduleSemester.toString());

    if (formData.tags.trim()) {
      const tagsArray = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      submitData.append("tags", JSON.stringify(tagsArray));
    }

    if (formData.image) {
      submitData.append("image", formData.image);
    }

    if (formData.equations.length) {
      submitData.append("equations", JSON.stringify(formData.equations));
    }

    if (formData.type === "MCQ") {
      const validOptions = formData.mcqOptions.filter((o) => o.text.trim());
      submitData.append("options", JSON.stringify(validOptions));
    } else {
      submitData.append("answer", formData.answer.trim());
    }

    setSubmitting(true);
    try {
      if (isEditMode) {
        await questionService.updateQuestion(question._id, submitData);
        alert("Question updated successfully!");
      } else {
        await questionService.createQuestion(submitData);
        alert("Question created successfully!");
        resetForm();
      }

      // Callback to refresh questions list
      if (onQuestionCreated) {
        onQuestionCreated();
      }
    } catch (error) {
      console.error("Error saving question:", error);
      alert(error.message || "Error saving question. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {isEditMode ? "Edit Question" : "Create New Question"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {isEditMode
                ? "Update your question details"
                : "Add questions to your question bank"}
            </p>
          </div>
          <div className="bg-blue-50 px-4 py-2 rounded-lg">
            <p className="text-sm font-medium text-blue-800">
              {module.moduleCode} - {module.moduleName}
            </p>
            <p className="text-xs text-blue-600">
              Year {module.moduleYear} • Semester {module.moduleSemester}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Question Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleInputChange("type", e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {questionTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Difficulty Level
            </label>
            <select
              value={formData.difficulty}
              onChange={(e) => handleInputChange("difficulty", e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {difficultyLevels.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Question Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Question Text *
          </label>
          <textarea
            value={formData.questionText}
            onChange={(e) => handleInputChange("questionText", e.target.value)}
            placeholder="Enter your question here..."
            rows={4}
            className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical ${
              errors.questionText ? "border-red-300" : "border-gray-300"
            }`}
          />
          {errors.questionText && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle size={16} className="mr-1" />
              {errors.questionText}
            </p>
          )}
        </div>

        {/* Answer for Structured/Essay */}
        {formData.type !== "MCQ" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Answer *
            </label>
            <textarea
              value={formData.answer}
              onChange={(e) => handleInputChange("answer", e.target.value)}
              placeholder="Enter the correct answer or solution..."
              rows={4}
              className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical ${
                errors.answer ? "border-red-300" : "border-gray-300"
              }`}
            />
            {errors.answer && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle size={16} className="mr-1" />
                {errors.answer}
              </p>
            )}
          </div>
        )}

        {/* MCQ Options */}
        {formData.type === "MCQ" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Answer Options *
            </label>
            <div className="space-y-3">
              {formData.mcqOptions.map((opt, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md"
                >
                  <input
                    type="checkbox"
                    checked={opt.isCorrect}
                    onChange={(e) =>
                      updateMCQOption(index, "isCorrect", e.target.checked)
                    }
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) =>
                      updateMCQOption(index, "text", e.target.value)
                    }
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {formData.mcqOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeMCQOption(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addMCQOption}
                className="flex items-center px-4 py-2 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
              >
                <Plus size={16} className="mr-2" />
                Add Option
              </button>
            </div>
            {errors.mcqOptions && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle size={16} className="mr-1" />
                {errors.mcqOptions}
              </p>
            )}
          </div>
        )}

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Image (Optional)
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              {imagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-w-xs max-h-48 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="image-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Upload a file</span>
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 5MB
                  </p>
                </>
              )}
            </div>
          </div>
          {errors.image && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle size={16} className="mr-1" />
              {errors.image}
            </p>
          )}
        </div>

        {/* Equations */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mathematical Equations (Optional)
          </label>
          <div className="flex space-x-3">
            <input
              type="text"
              value={newEquation}
              onChange={(e) => setNewEquation(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && (e.preventDefault(), addEquation())
              }
              className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter LaTeX equation: x^2 + y^2 = r^2"
            />
            <button
              type="button"
              onClick={addEquation}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
            >
              <Plus size={16} />
            </button>
          </div>
          {formData.equations.length > 0 && (
            <div className="mt-3 space-y-2">
              {formData.equations.map((eq, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-md"
                >
                  <span className="font-mono text-sm">{eq}</span>
                  <button
                    type="button"
                    onClick={() => removeEquation(i)}
                    className="text-red-600 hover:bg-red-50 p-1 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags (Optional)
          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => handleInputChange("tags", e.target.value)}
            placeholder="e.g., algebra, calculus, derivatives (comma-separated)"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            Separate multiple tags with commas
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} className="mr-2" />
            {submitting
              ? isEditMode
                ? "Updating..."
                : "Creating..."
              : isEditMode
              ? "Update Question"
              : "Create Question"}
          </button>
        </div>
      </form>
    </div>
  );
}
