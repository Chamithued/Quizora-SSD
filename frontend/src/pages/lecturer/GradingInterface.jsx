import { useState, useEffect } from 'react';
import { ASSET_BASE_URL } from '../../services/apiConfig';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useParams, useNavigate } from 'react-router-dom';
import { gradingService } from '../../services/gradingService';
import { rubricService } from '../../services/rubricService';
import { 
  ArrowLeft,
  User,
  Clock,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Save,
  Download,
  Lock,
  Unlock,
  Eye,
  Target,
  Star,
  FileText
} from 'lucide-react';

const GradingInterface = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState({});
  const [grades, setGrades] = useState({});
  const [availableRubrics, setAvailableRubrics] = useState([]);
  const [selectedRubrics, setSelectedRubrics] = useState({});
  const [rubricScores, setRubricScores] = useState({});
  const [gradingMode, setGradingMode] = useState('traditional'); // 'traditional' or 'rubric'
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    loadSubmissionData();
  }, [submissionId]);

  useEffect(() => {
    if (answers && Object.keys(answers).length > 0) {
      loadAvailableRubrics();
    } else if (Object.keys(answers).length === 0) {
      // Load rubrics even if no answers yet
      loadAvailableRubrics();
    }
  }, [answers]);

  const loadSubmissionData = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await gradingService.getSubmissionForGrading(submissionId);
      
      console.log('Frontend received response:', response);
      console.log('Response data:', response?.data);
      console.log('Submission data:', response?.data?.submission);
      
      setSubmission(response?.data?.submission);
      setAnswers(response?.data?.answers || {});

      // Initialize grades with current values
      const initialGrades = {};
      const initialRubricScores = {};
      const initialSelectedRubrics = {};
      
      const structuredAnswers = response?.data?.answers?.structured || [];
      const essayAnswers = response?.data?.answers?.essay || [];
      
      [...structuredAnswers, ...essayAnswers].forEach(answer => {
        initialGrades[answer.questionId] = {
          marks: answer.marks || 0,
          maxMarks: answer.maxMarks || 1
        };

        // Load existing rubric data if available
        if (answer.rubricScoring && answer.rubricScoring.criteriaScores) {
          const rubricScoring = answer.rubricScoring;
          
          // Find the rubric in available rubrics (will be loaded later)
          // We'll set this after rubrics are loaded
          const criteriaScores = {};
          rubricScoring.criteriaScores.forEach(criteriaScore => {
            criteriaScores[criteriaScore.criterionId] = {
              selectedLevel: criteriaScore.selectedLevelId,
              points: criteriaScore.points,
              feedback: criteriaScore.feedback
            };
          });
          
          initialRubricScores[answer.questionId] = criteriaScores;
          // We'll need to find and set the rubric object after loading available rubrics
        }
      });
      
      setGrades(initialGrades);
      setRubricScores(initialRubricScores);

    } catch (err) {
      console.error('Load submission error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.message || err.message || 'Failed to load submission data');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableRubrics = async () => {
    try {
      const response = await rubricService.getRubrics();
      const rubrics = response.rubrics || [];
      setAvailableRubrics(rubrics);

      // Match existing rubric data with loaded rubrics
      if (answers && Object.keys(rubricScores).length > 0) {
        const updatedSelectedRubrics = {};
        
        [...(answers.structured || []), ...(answers.essay || [])].forEach(answer => {
          if (answer.rubricScoring && rubricScores[answer.questionId]) {
            const rubric = rubrics.find(r => r._id === answer.rubricScoring.rubricId);
            if (rubric) {
              updatedSelectedRubrics[answer.questionId] = rubric;
            }
          }
        });
        
        setSelectedRubrics(updatedSelectedRubrics);
      }
    } catch (err) {
      console.error('Failed to load rubrics:', err);
    }
  };

  const handleGradeChange = (questionId, field, value) => {
    setGrades(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: Math.max(0, parseFloat(value) || 0)
      }
    }));
  };

  const handleRubricSelection = (questionId, rubricId) => {
    const rubric = availableRubrics.find(r => r._id === rubricId);
    if (rubric) {
      setSelectedRubrics(prev => ({
        ...prev,
        [questionId]: rubric
      }));
      
      // Initialize rubric scores
      const initialScores = {};
      rubric.criteria.forEach(criterion => {
        initialScores[criterion._id] = {
          selectedLevel: null,
          points: 0,
          feedback: ''
        };
      });
      
      setRubricScores(prev => ({
        ...prev,
        [questionId]: initialScores
      }));
    }
  };

  const handleRubricScoring = (questionId, criterionId, field, value) => {
    setRubricScores(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [criterionId]: {
          ...prev[questionId]?.[criterionId] || {},
          [field]: value
        }
      }
    }));

    // Auto-update traditional grade based on rubric score
    if (field === 'points' || field === 'selectedLevel') {
      calculateRubricTotal(questionId);
    }
  };

  const calculateRubricTotal = (questionId) => {
    const rubric = selectedRubrics[questionId];
    const scores = rubricScores[questionId];
    
    if (!rubric || !scores) return;

    let totalWeightedPoints = 0;
    let totalMaxWeightedPoints = 0;
    let totalWeight = 0;

    rubric.criteria.forEach(criterion => {
      const score = scores[criterion._id];
      const weight = criterion.weight || 0;
      const maxLevelPoints = Math.max(...criterion.performanceLevels.map(l => l.points || 0));
      
      // Add to total weight regardless of scoring
      totalWeight += weight;
      
      if (score && score.selectedLevel) {
        const level = criterion.performanceLevels.find(l => l._id === score.selectedLevel);
        if (level) {
          totalWeightedPoints += (level.points || 0) * (weight / 100);
        }
      }
      
      // Always add max points for this criterion
      totalMaxWeightedPoints += maxLevelPoints * (weight / 100);
    });

    // Normalize if total weight is not 100%
    let finalTotalPoints = totalWeightedPoints;
    let finalMaxPoints = totalMaxWeightedPoints;
    
    if (totalWeight > 0 && totalWeight !== 100) {
      const normalizationFactor = 100 / totalWeight;
      finalTotalPoints = totalWeightedPoints * normalizationFactor;
      finalMaxPoints = totalMaxWeightedPoints * normalizationFactor;
    }

    // Update traditional grade
    setGrades(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        marks: Math.round((finalTotalPoints || 0) * 100) / 100,
        maxMarks: Math.round((finalMaxPoints || 1) * 100) / 100 // Ensure at least 1 to prevent division by zero
      }
    }));
  };

  const handleSaveGrades = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      // Validation: Check if all manual questions have been graded
      const structuredAnswers = answers?.structured || [];
      const essayAnswers = answers?.essay || [];
      const allManualQuestions = [...structuredAnswers, ...essayAnswers];
      
      const missingGrades = [];
      const missingRubricScores = [];
      
      for (const answer of allManualQuestions) {
        const grade = grades[answer.questionId];
        const rubric = selectedRubrics[answer.questionId];
        const rubricScore = rubricScores[answer.questionId];
        
        // If using rubric-based grading, validate all criteria are scored
        if (rubric && rubricScore) {
          for (const criterion of rubric.criteria) {
            const criterionScore = rubricScore[criterion._id];
            if (!criterionScore || !criterionScore.selectedLevel) {
              missingRubricScores.push(`"${answer.questionDetails?.questionText?.substring(0, 30) + '...'}": Missing score for criterion "${criterion.name}"`);
            }
          }
        }
        
        // Traditional validation
        if (!grade || (grade.marks === undefined || grade.marks === null || grade.marks === '')) {
          missingGrades.push(answer.questionDetails?.questionText?.substring(0, 50) + '...' || 'Unknown question');
        } else if (Number(grade.marks) < 0 || Number(grade.marks) > Number(grade.maxMarks)) {
          setError(`Invalid marks for question: "${answer.questionDetails?.questionText?.substring(0, 50) + '...' || 'Unknown question'}". Marks must be between 0 and ${grade.maxMarks}.`);
          return;
        }
      }
      
      // Check for missing rubric scores
      if (missingRubricScores.length > 0) {
        setError(`Please complete all rubric scoring: ${missingRubricScores.join(', ')}`);
        return;
      }
      
      if (missingGrades.length > 0) {
        setError(`Please provide grades for all questions. Missing grades for: ${missingGrades.join(', ')}`);
        return;
      }

      // Prepare graded answers with rubric data if available
      const gradedAnswers = Object.entries(grades).map(([questionId, grade]) => {
        const answerData = {
          questionId,
          marks: Number(grade.marks),
          maxMarks: Number(grade.maxMarks)
        };

        // Add rubric scoring if rubric was used
        if (selectedRubrics[questionId] && rubricScores[questionId]) {
          const rubric = selectedRubrics[questionId];
          const scores = rubricScores[questionId];
          
          answerData.rubricScoring = {
            rubricId: rubric._id,
            criteriaScores: Object.entries(scores).map(([criterionId, score]) => {
              const criterion = rubric.criteria.find(c => c._id === criterionId);
              const selectedLevel = criterion?.performanceLevels.find(l => l._id === score.selectedLevel);
              
              return {
                criterionId,
                criterionName: criterion?.name || '',
                selectedLevelId: score.selectedLevel,
                selectedLevelName: selectedLevel?.level || '',
                points: score.points || 0,
                maxPoints: Math.max(...(criterion?.performanceLevels.map(l => l.points) || [0])),
                weight: criterion?.weight || 0,
                feedback: score.feedback || ''
              };
            })
          };
        }

        return answerData;
      });

      const response = await gradingService.updateManualGrades(submissionId, gradedAnswers);
      
      setSuccessMessage('Grades saved successfully!');
      setTimeout(() => {
        navigate('/lecturer/grading');
      }, 2000);

    } catch (err) {
      setError(err.message || 'Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    try {
      setFinalizing(true);
      setError('');
      setSuccessMessage('');
      await gradingService.finalizeSubmission(submissionId);
      setSuccessMessage('Submission finalized. Students can now see the mark.');
      await loadSubmissionData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to finalize submission');
    } finally {
      setFinalizing(false);
    }
  };

  const handleUnfinalize = async () => {
    try {
      setFinalizing(true);
      setError('');
      setSuccessMessage('');
      await gradingService.unfinalizeSubmission(submissionId);
      setSuccessMessage('Submission unlocked for editing.');
      await loadSubmissionData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to unfinalize submission');
    } finally {
      setFinalizing(false);
    }
  };

  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF();

      // Header
      doc.setFontSize(18);
      doc.text('Submission Report', 105, 16, { align: 'center' });
      doc.setFontSize(10);
      const statusLabel = submission?.status === 'reviewed' ? 'Finalized' : 'Draft';
      doc.text(`Status: ${statusLabel}`, 105, 22, { align: 'center' });

      // Student & Quiz Info
      const studentName = `${submission?.student?.firstName || ''} ${submission?.student?.lastName || ''}`.trim();
      const studentEmail = submission?.student?.email || '';
      const quizTitle = submission?.quiz?.title || '';
      const moduleCode = submission?.module?.moduleCode || '';
      const submittedAt = submission?.submittedAt ? new Date(submission.submittedAt).toLocaleString() : '';
      const totals = calculateTotalGrades();

      autoTable(doc, {
        startY: 28,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        body: [
          ['Student', studentName],
          ['Email', studentEmail],
          ['Quiz', quizTitle],
          ['Module', moduleCode],
          ['Submitted', submittedAt],
          ['Current Total', `${totals.totalMarks}/${totals.totalMaxMarks} (${totals.percentage}%)`]
        ],
        columns: [
          { header: 'Field', dataKey: 'k' },
          { header: 'Value', dataKey: 'v' }
        ],
        didParseCell: (data) => {
          // data.table.body is an array of rows; our body is array of arrays, jsPDF-AutoTable maps them sequentially
        }
      });

      let y = (doc.lastAutoTable && doc.lastAutoTable.finalY)
        ? doc.lastAutoTable.finalY + 6
        : 34;

      // Questions Summary
      const allAnswers = [
        ...(answers.mcq || []),
        ...(answers.structured || []),
        ...(answers.essay || [])
      ];

      const rows = allAnswers.map((ans, index) => {
        const questionText = ans?.questionDetails?.questionText || '';
        const shortQ = questionText.length > 80 ? questionText.slice(0, 77) + '...' : questionText;
        const marks = `${ans.marks ?? 0}/${ans.maxMarks ?? 1}`;
        let note = '';
        if (ans.questionType === 'MCQ') {
          note = ans.isCorrect ? 'Correct' : 'Incorrect';
        } else if (ans.rubricScoring && ans.rubricScoring.criteriaScores?.length) {
          note = 'Rubric used';
        }
        return {
          idx: index + 1,
          type: ans.questionType,
          question: shortQ,
          marks,
          note
        };
      });

      autoTable(doc, {
        startY: y,
        head: [['#', 'Type', 'Question', 'Marks', 'Note']],
        body: rows.map(r => [r.idx, r.type, r.question, r.marks, r.note]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] }
      });

      y = (doc.lastAutoTable && doc.lastAutoTable.finalY)
        ? doc.lastAutoTable.finalY + 6
        : y + 6;

      // Optional detailed rubric breakdown
      allAnswers.forEach((ans, i) => {
        if (ans.rubricScoring && ans.rubricScoring.criteriaScores?.length) {
          const qLabel = ans?.questionDetails?.questionText || `Question ${i + 1}`;
          const label = qLabel.length > 80 ? qLabel.slice(0, 77) + '...' : qLabel;
          doc.setFontSize(11);
          doc.text(`Rubric Details: ${label}`, 14, y);
          y += 2;
          autoTable(doc, {
            startY: y,
            head: [['Criterion', 'Level', 'Points', 'Max', 'Weight', 'Feedback']],
            body: ans.rubricScoring.criteriaScores.map(cs => [
              cs.criterionName || '',
              cs.selectedLevelName || '',
              cs.points || 0,
              cs.maxPoints || 0,
              (cs.weight ?? 0) + '%',
              cs.feedback || ''
            ]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [147, 51, 234] }
          });
          y = (doc.lastAutoTable && doc.lastAutoTable.finalY)
            ? doc.lastAutoTable.finalY + 6
            : y + 6;
        }
      });

      // Draft watermark if not finalized
      if (submission?.status !== 'reviewed') {
        doc.setFontSize(60);
        doc.setTextColor(200, 200, 200);
        doc.saveGraphicsState?.();
        doc.text('DRAFT', 35, 160, { angle: 45, opacity: 0.2 });
        doc.restoreGraphicsState?.();
      }

      const fileName = `Submission_${studentName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (e) {
      // Non-fatal: just set an error banner
      setError('Failed to generate PDF report.');
    }
  };

  const calculateTotalGrades = () => {
    let totalMarks = 0;
    let totalMaxMarks = 0;

    // Add MCQ scores
    answers.mcq?.forEach(answer => {
      totalMarks += answer.marks || 0;
      totalMaxMarks += answer.maxMarks || 1;
    });

    // Add manual grades
    Object.values(grades).forEach(grade => {
      totalMarks += grade.marks || 0;
      totalMaxMarks += grade.maxMarks || 1;
    });

    const percentage = totalMaxMarks > 0 ? Math.round((totalMarks / totalMaxMarks) * 100) : 0;

    return { totalMarks, totalMaxMarks, percentage };
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderAnswerCard = (answer, isGradable = false) => {
    const question = answer.questionDetails;
    const currentGrade = grades[answer.questionId] || { marks: 0, maxMarks: 1 };

    return (
      <div key={answer.questionId} className="bg-white border border-gray-200 rounded-lg p-6">
        {/* Question */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              answer.questionType === 'MCQ' ? 'bg-blue-100 text-blue-800' :
              answer.questionType === 'Structured' ? 'bg-green-100 text-green-800' :
              'bg-purple-100 text-purple-800'
            }`}>
              {answer.questionType}
            </span>
            {answer.questionType === 'MCQ' && (
              <span className={`text-sm font-medium ${
                answer.isCorrect ? 'text-green-600' : 'text-red-600'
              }`}>
                {answer.isCorrect ? 'Correct' : 'Incorrect'} ({answer.marks}/{answer.maxMarks})
              </span>
            )}
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">Question:</h3>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-gray-800">{question?.questionText}</p>
            
            {/* Show equation if available */}
            {question?.equations && question.equations.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">Related equations:</p>
                {question.equations.map((equation, index) => (
                  <div key={index} className="font-mono text-sm bg-white p-2 rounded border">
                    {equation}
                  </div>
                ))}
              </div>
            )}

            {/* Show image if available */}
            {question?.image && (
              <div className="mt-3">
                <img
                  src={`${ASSET_BASE_URL}/uploads/${question.image}`}
                  alt="Question"
                  className="max-w-md h-auto border border-gray-300 rounded-lg"
                />
              </div>
            )}
          </div>
        </div>

        {/* Student Answer */}
        <div className="mb-4">
          <h4 className="text-md font-medium text-gray-900 mb-2">Student's Answer:</h4>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            {answer.questionType === 'MCQ' ? (
              <div>
                <p className="text-gray-800">Selected: <strong>{answer.studentAnswer}</strong></p>
                <p className="text-sm text-gray-600 mt-1">
                  Correct Answer: <strong>{answer.correctAnswer}</strong>
                </p>
              </div>
            ) : (
              <p className="text-gray-800 whitespace-pre-wrap">{answer.studentAnswer || 'No answer provided'}</p>
            )}
          </div>
        </div>

        {/* Model Answer (for non-MCQ) */}
        {answer.questionType !== 'MCQ' && question?.correctAnswer && (
          <div className="mb-4">
            <h4 className="text-md font-medium text-gray-900 mb-2">Model Answer:</h4>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-gray-800 whitespace-pre-wrap">{question.correctAnswer}</p>
            </div>
          </div>
        )}

        {/* Grading Section */}
        {isGradable && (
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-900">Grade this Answer:</h4>
              
              {/* Grading Mode Toggle */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setGradingMode('traditional')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    gradingMode === 'traditional'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Target className="w-4 h-4 inline mr-1" />
                  Traditional
                </button>
                <button
                  type="button"
                  onClick={() => setGradingMode('rubric')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    gradingMode === 'rubric'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <FileText className="w-4 h-4 inline mr-1" />
                  Rubric-based
                </button>
              </div>
            </div>

            {gradingMode === 'traditional' ? (
              /* Traditional Grading */
              <div className="flex items-center space-x-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marks Awarded
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={currentGrade.maxMarks}
                    step="0.5"
                    value={currentGrade.marks}
                    onChange={(e) => handleGradeChange(answer.questionId, 'marks', e.target.value)}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="text-lg font-medium text-gray-900">/</div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Marks
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={currentGrade.maxMarks}
                    onChange={(e) => handleGradeChange(answer.questionId, 'maxMarks', e.target.value)}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="ml-4">
                  <span className="text-sm text-gray-600">
                    Percentage: {currentGrade.maxMarks > 0 ? Math.round((currentGrade.marks / currentGrade.maxMarks) * 100) : 0}%
                  </span>
                </div>
              </div>
            ) : (
              /* Rubric-based Grading */
              <div className="space-y-4">
                {/* Rubric Selection */}
                {!selectedRubrics[answer.questionId] && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select a Rubric:
                    </label>
                    <select
                      onChange={(e) => handleRubricSelection(answer.questionId, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Choose a rubric...</option>
                      {availableRubrics
                        .filter(rubric => 
                          rubric.questionTypes.includes(answer.questionType) ||
                          rubric.questionTypes.length === 0
                        )
                        .map(rubric => (
                          <option key={rubric._id} value={rubric._id}>
                            {rubric.title} {rubric.isTemplate && '(Template)'}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Rubric Grading Interface */}
                {selectedRubrics[answer.questionId] && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="font-medium text-purple-900">
                        {selectedRubrics[answer.questionId].title}
                      </h5>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRubrics(prev => {
                            const newRubrics = { ...prev };
                            delete newRubrics[answer.questionId];
                            return newRubrics;
                          });
                          setRubricScores(prev => {
                            const newScores = { ...prev };
                            delete newScores[answer.questionId];
                            return newScores;
                          });
                        }}
                        className="text-sm text-purple-600 hover:text-purple-700"
                      >
                        Change Rubric
                      </button>
                    </div>

                    <div className="space-y-4">
                      {selectedRubrics[answer.questionId].criteria.map(criterion => (
                        <div key={criterion._id} className="bg-white rounded-lg p-3 border border-purple-200">
                          <div className="flex items-center justify-between mb-2">
                            <h6 className="font-medium text-gray-900">{criterion.name}</h6>
                            <span className="text-sm text-gray-500">Weight: {criterion.weight}%</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{criterion.description}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {criterion.performanceLevels.map(level => (
                              <label key={level._id} className="flex items-start space-x-2 p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`${answer.questionId}-${criterion._id}`}
                                  value={level._id}
                                  checked={rubricScores[answer.questionId]?.[criterion._id]?.selectedLevel === level._id}
                                  onChange={(e) => {
                                    handleRubricScoring(answer.questionId, criterion._id, 'selectedLevel', e.target.value);
                                    handleRubricScoring(answer.questionId, criterion._id, 'points', level.points);
                                  }}
                                  className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-sm">{level.level}</span>
                                    <span className="text-sm text-gray-500">{level.points} pts</span>
                                  </div>
                                  <p className="text-xs text-gray-600">{level.description}</p>
                                </div>
                              </label>
                            ))}
                          </div>

                          {/* Optional feedback for this criterion */}
                          <div className="mt-2">
                            <textarea
                              placeholder="Additional feedback for this criterion (optional)"
                              value={rubricScores[answer.questionId]?.[criterion._id]?.feedback || ''}
                              onChange={(e) => handleRubricScoring(answer.questionId, criterion._id, 'feedback', e.target.value)}
                              rows={2}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Rubric Summary */}
                    <div className="mt-4 p-3 bg-white border border-purple-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">Rubric Score:</span>
                        <span className="font-semibold text-purple-700">
                          {currentGrade.marks.toFixed(1)}/{currentGrade.maxMarks.toFixed(1)} 
                          ({currentGrade.maxMarks > 0 ? Math.round((currentGrade.marks / currentGrade.maxMarks) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !submission) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
        <span className="ml-2 text-gray-600">Loading submission...</span>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Submission Not Found</h3>
        <p className="text-gray-600 mb-4">The submission you're looking for could not be loaded.</p>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4 max-w-md mx-auto">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        <div className="text-xs text-gray-500 mb-4">
          <p>Submission ID: {submissionId}</p>
          <p>Check the grading dashboard for available submissions</p>
        </div>
        <button
          onClick={() => navigate('/lecturer/grading')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Grading Dashboard
        </button>
      </div>
    );
  }

  const totalGrades = calculateTotalGrades();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/lecturer/grading')}
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Grading Dashboard
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-600">Current Total</p>
            <p className="text-lg font-semibold text-gray-900">
              {totalGrades.totalMarks}/{totalGrades.totalMaxMarks} ({totalGrades.percentage}%)
            </p>
          </div>
          
          {/* Save disabled when reviewed */}
          <button
            onClick={handleSaveGrades}
            disabled={saving || submission?.status === 'reviewed'}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${submission?.status === 'reviewed' ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50`}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Grades
              </>
            )}
          </button>

          {/* Download PDF */}
          <button
            onClick={handleDownloadPdf}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </button>

          {/* Finalize/Unfinalize Button */}
          {submission?.status === 'reviewed' ? (
            <button
              onClick={handleUnfinalize}
              disabled={finalizing}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
            >
              {finalizing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Unlocking...
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 mr-2" />
                  Unfinalize
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleFinalize}
              disabled={finalizing}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {finalizing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Finalizing...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Finalize Marks
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Student Information */}
      {submission && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {submission?.student?.firstName} {submission?.student?.lastName}
                </h2>
                <p className="text-gray-600">{submission?.student?.email}</p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center justify-end space-x-2 mb-1">
                <h3 className="text-lg font-medium text-gray-900">{submission?.quiz?.title}</h3>
                {submission?.status === 'graded' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    Re-grading
                  </span>
                )}
                {submission?.status === 'reviewed' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Finalized (Locked)
                  </span>
                )}
              </div>
              <p className="text-gray-600">{submission?.module?.moduleCode}</p>
              <div className="flex items-center space-x-4 mt-2">
                <span className="inline-flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  {submission?.timeTaken} minutes
                </span>
                <span className="text-sm text-gray-500">
                  Submitted: {formatDate(submission?.submittedAt)}
                </span>
                {submission?.status === 'graded' && submission?.gradedAt && (
                  <span className="text-sm text-gray-500">
                    Last graded: {formatDate(submission?.gradedAt)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <p className="text-green-800">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Grading Sections */}
      <div className="grid grid-cols-1 gap-6">
        {/* MCQ Questions (Read-only) */}
        {answers.mcq && answers.mcq.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Multiple Choice Questions (Auto-graded)
            </h2>
            <div className="space-y-4">
              {answers.mcq.map(answer => renderAnswerCard(answer, false))}
            </div>
          </div>
        )}

        {/* Structured Questions */}
        {answers.structured && answers.structured.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Structured Questions (Requires Manual Grading)
            </h2>
            <div className="space-y-4">
              {answers.structured.map(answer => renderAnswerCard(answer, true))}
            </div>
          </div>
        )}

        {/* Essay Questions */}
        {answers.essay && answers.essay.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Essay Questions (Requires Manual Grading)
            </h2>
            <div className="space-y-4">
              {answers.essay.map(answer => renderAnswerCard(answer, true))}
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Grading Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">MCQ Questions</p>
            <p className="text-lg font-semibold text-blue-600">{answers.mcq?.length || 0}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Manual Grading Required</p>
            <p className="text-lg font-semibold text-orange-600">
              {(answers.structured?.length || 0) + (answers.essay?.length || 0)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Final Score</p>
            <p className="text-lg font-semibold text-green-600">
              {totalGrades.totalMarks}/{totalGrades.totalMaxMarks} ({totalGrades.percentage}%)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GradingInterface;
