import React, { useState, useEffect } from "react";
import { marksheetService } from "../../services/marksheetService";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "../../context/AuthContext";

const Marksheet = () => {
  const { user } = useAuth();
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState("all"); // 'all', 'quiz', or 'module'
  const [selectedFilter, setSelectedFilter] = useState("all");

  useEffect(() => {
    const fetchMarks = async () => {
      try {
        setLoading(true);
        const res = await marksheetService.getStudentMarksheet();
        const results = res?.results ?? [];
        setMarks(results);
        setError("");
      } catch (err) {
        let message = "Failed to fetch marksheet.";
        if (err.message?.includes("Unauthorized")) {
          message = "You are not logged in. Please log in as a student.";
        } else if (err.message?.includes("Cannot connect to server")) {
          message =
            "Cannot connect to server. Please check if the backend is running.";
        } else if (err.message) {
          message = err.message;
        }
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchMarks();
  }, []);

  // Backend already filters to published results. Keep as-is, but guard in UI too.
  let filteredMarks = marks;

  // Get unique quizzes and modules for filter dropdowns
  const uniqueQuizzes = [
    ...new Set(filteredMarks.map((mark) => mark.quizId?.title).filter(Boolean)),
  ];
  const uniqueModules = [
    ...new Set(
      filteredMarks.map((mark) => mark.moduleId?.moduleName).filter(Boolean)
    ),
  ];

  // Apply filter based on type and selected value
  if (filterType === "quiz" && selectedFilter !== "all") {
    filteredMarks = filteredMarks.filter(
      (mark) => mark.quizId?.title === selectedFilter
    );
  } else if (filterType === "module" && selectedFilter !== "all") {
    filteredMarks = filteredMarks.filter(
      (mark) => mark.moduleId?.moduleName === selectedFilter
    );
  }

  // Sort alphabetically based on filter type
  filteredMarks = [...filteredMarks].sort((a, b) => {
    if (filterType === "quiz") {
      const titleA = a.quizId?.title || "";
      const titleB = b.quizId?.title || "";
      return titleA.localeCompare(titleB);
    } else if (filterType === "module") {
      const moduleA = a.moduleId?.moduleName || "";
      const moduleB = b.moduleId?.moduleName || "";
      return moduleA.localeCompare(moduleB);
    }
    return 0;
  });

  // Reset selected filter when filter type changes
  const handleFilterTypeChange = (newType) => {
    setFilterType(newType);
    setSelectedFilter("all");
  };

  // PDF Export Function
  const exportToPDF = () => {
    const doc = new jsPDF();

    // Add Quizora Header/Logo
    doc.setFontSize(20);
    doc.setTextColor(34, 197, 94); // Green color
    doc.text("Quizora", 105, 15, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Assessment Platform", 105, 22, { align: "center" });

    // Add horizontal line
    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 27, 190, 27);

    // Add Student Information
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Student Marksheet", 20, 37);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Student Name: ${user?.firstName} ${user?.lastName}`, 20, 45);
    doc.text(`Email: ${user?.email}`, 20, 51);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 57);

    // Prepare table data
    const tableData = filteredMarks.map((mark) => [
      mark.quizId?.title || "-",
      mark.moduleId?.moduleName || "-",
      `${mark.score} / ${mark.totalMarks}`,
      mark.grade,
      mark.status,
    ]);

    // Add table
    doc.autoTable({
      startY: 65,
      head: [["Quiz", "Module", "Mark", "Grade", "Status"]],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: [34, 197, 94],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      styles: {
        fontSize: 10,
        cellPadding: 5,
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    // Add footer
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(
        `Page ${i} of ${pageCount}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );
    }

    // Save the PDF
    doc.save(
      `Marksheet_${user?.firstName}_${user?.lastName}_${
        new Date().toISOString().split("T")[0]
      }.pdf`
    );
  };

  return (
    <div className="p-6 bg-white rounded shadow-md">
      <h2 className="text-2xl font-bold mb-4">Student Marksheet</h2>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {/* Filter/Sort Controls */}
      <div className="flex gap-4 mb-4">
        {/* Filter Type Selector */}
        <select
          value={filterType}
          onChange={(e) => handleFilterTypeChange(e.target.value)}
          className="border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
        >
          <option value="all">Show All</option>
          <option value="quiz">Filter by Quiz</option>
          <option value="module">Filter by Module</option>
        </select>

        {/* Dynamic Filter Dropdown - Shows based on filter type */}
        {filterType !== "all" && (
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">
              All {filterType === "quiz" ? "Quizzes" : "Modules"}
            </option>
            {filterType === "quiz"
              ? uniqueQuizzes.map((quiz, index) => (
                  <option key={index} value={quiz}>
                    {quiz}
                  </option>
                ))
              : uniqueModules.map((module, index) => (
                  <option key={index} value={module}>
                    {module}
                  </option>
                ))}
          </select>
        )}
      </div>
      {/* Marksheet Table */}
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Quiz</th>
            <th className="p-2 border">Module</th>
            <th className="p-2 border">Mark</th>
            <th className="p-2 border">Grade</th>
            <th className="p-2 border">Status</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5} className="text-center p-4">
                Loading...
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={5} className="text-center p-4 text-gray-400">
                No marksheet data available.
              </td>
            </tr>
          ) : filteredMarks.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center p-4 text-gray-400">
                No finalized marks found. Your marksheet will appear here once
                your quizzes are graded.
              </td>
            </tr>
          ) : (
            filteredMarks.map((mark, idx) => (
              <tr key={idx}>
                <td className="p-2 border">{mark.quizId?.title || "-"}</td>
                <td className="p-2 border">
                  {mark.moduleId?.moduleName || "-"}
                </td>
                <td className="p-2 border">
                  {mark.score} / {mark.totalMarks}
                </td>
                <td className="p-2 border">{mark.grade}</td>
                <td className="p-2 border">
                  <span className="px-2 py-1 rounded text-xs font-semibold bg-green-200 text-green-800">
                    {mark.status}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {/* Export PDF Button */}
      <button
        onClick={exportToPDF}
        disabled={filteredMarks.length === 0}
        className={`mt-6 px-6 py-3 rounded font-semibold transition-all ${
          filteredMarks.length === 0
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-md hover:shadow-lg"
        }`}
      >
        {filteredMarks.length === 0 ? "No Data to Export" : "📄 Export as PDF"}
      </button>
    </div>
  );
};

export default Marksheet;