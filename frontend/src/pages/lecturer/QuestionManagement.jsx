import { useState } from "react";
import ModuleList from "../../components/lecturer/ModuleList";
import QuestionBank from "../../components/QuestionBank";
import QuestionForm from "./QuestionForm";
import ModuleModal from "../../components/lecturer/ModuleModal";
import { ArrowLeft } from "lucide-react";

const QuestionManagement = () => {
  const [currentView, setCurrentView] = useState("modules"); // 'modules', 'questions', 'create-question', 'edit-question'
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editingModule, setEditingModule] = useState(null);

  const handleSelectModule = (module) => {
    setSelectedModule(module);
    setCurrentView("questions");
  };

  const handleCreateModule = () => {
    setEditingModule(null);
    setShowModuleModal(true);
  };

  const handleEditModule = (module) => {
    setEditingModule(module);
    setShowModuleModal(true);
  };

  const handleCreateQuestion = () => {
    setSelectedQuestion(null);
    setCurrentView("create-question");
  };

  const handleEditQuestion = (question) => {
    setSelectedQuestion(question);
    setCurrentView("edit-question");
  };

  const handleBackToModules = () => {
    setSelectedModule(null);
    setCurrentView("modules");
  };

  const handleBackToQuestions = () => {
    setSelectedQuestion(null);
    setCurrentView("questions");
  };

  const handleModuleModalClose = (shouldRefresh = false) => {
    setShowModuleModal(false);
    setEditingModule(null);
    // If refresh needed, the ModuleList component will handle it via useEffect
  };

  const handleQuestionCreated = () => {
    setCurrentView("questions");
    setSelectedQuestion(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/*added new line for the ev*/}
        <div className="p-3 mb-4 bg-yellow-100 text-yellow-800 rounded-md text-sm font-semibold">
          Evidence Commit: Marksheet feature and Question Management module
          integration in progress.
        </div>

        {/*added new line for the ev*/}

        {/* Module List View */}
        {currentView === "modules" && (
          <ModuleList
            onSelectModule={handleSelectModule}
            onCreateModule={handleCreateModule}
            onEditModule={handleEditModule}
          />
        )}

        {/* Question Bank View */}
        {currentView === "questions" && selectedModule && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={handleBackToModules}
                  className="flex items-center text-gray-600 hover:text-gray-800 mr-4"
                >
                  <ArrowLeft size={20} className="mr-2" />
                  Back to Modules
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {selectedModule.moduleCode} - {selectedModule.moduleName}
                  </h1>
                  <p className="text-sm text-gray-600">
                    Year {selectedModule.moduleYear} • Semester{" "}
                    {selectedModule.moduleSemester}
                  </p>
                </div>
              </div>
            </div>

            <QuestionBank
              module={selectedModule}
              onCreateNew={handleCreateQuestion}
              onEditQuestion={handleEditQuestion}
            />
          </div>
        )}

        {/* Question Form Views */}
        {(currentView === "create-question" ||
          currentView === "edit-question") &&
          selectedModule && (
            <div className="space-y-6">
              <div className="flex items-center">
                <button
                  onClick={handleBackToQuestions}
                  className="flex items-center text-gray-600 hover:text-gray-800"
                >
                  <ArrowLeft size={20} className="mr-2" />
                  Back to Questions
                </button>
              </div>

              <QuestionForm
                question={selectedQuestion}
                module={selectedModule}
                onQuestionCreated={handleQuestionCreated}
              />
            </div>
          )}

        {/* Module Modal */}
        {showModuleModal && (
          <ModuleModal
            module={editingModule}
            onClose={handleModuleModalClose}
          />
        )}
      </div>
    </div>
  );
};

export default QuestionManagement;
