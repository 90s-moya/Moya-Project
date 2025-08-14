import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { checkServerHealth, startCalibration, runCalibration, getCalibrations } from '@/api/gazeApi';
import GazeAnalysisResult from '@/components/interview/GazeAnalysisResult';

enum CalibrationStatus {
  NotStarted,
  InProgress,
  Completed,
  Failed
}

export default function GazeTestPage() {
  const [serverStatus, setServerStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [calibrationStatus, setCalibrationStatus] = useState<CalibrationStatus>(CalibrationStatus.NotStarted);
  const [calibrationFile, setCalibrationFile] = useState<string>("");
  const [testResultFile, setTestResultFile] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testServerConnection = async () => {
    try {
      addLog('서버 연결 테스트 중...');
      const response = await checkServerHealth();
      if (response.status === 'healthy') {
        setServerStatus('connected');
        addLog('✅ 서버 연결 성공');
        addLog(`캘리브레이터 준비: ${response.calibrator_ready ? '✅' : '❌'}`);
        addLog(`트래커 준비: ${response.tracker_ready ? '✅' : '❌'}`);
      }
    } catch (error) {
      setServerStatus('error');
      addLog('❌ 서버 연결 실패 - gaze_server.py가 실행 중인지 확인하세요');
      console.error('서버 연결 실패:', error);
    }
  };

  const runTestCalibration = async () => {
    try {
      setCalibrationStatus(CalibrationStatus.InProgress);
      addLog('캘리브레이션 시작...');

      const sessionName = `test_${Date.now()}`;
      
      // 1. 캘리브레이션 초기화
      await startCalibration({
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        window_width: window.innerWidth,
        window_height: window.innerHeight,
        mode: 'quick',
        user_id: 'test_user',
        session_name: sessionName
      });

      addLog('캘리브레이션 초기화 완료');

      // 2. 캘리브레이션 실행
      await runCalibration({
        mode: 'quick',
        user_id: 'test_user',
        session_name: sessionName
      });

      addLog('캘리브레이션 실행 중... (별도 창에서 진행)');
      addLog('화면의 점들을 순서대로 응시하고 SPACE키를 눌러주세요');

      // 3. 완료 확인
      setTimeout(async () => {
        try {
          const response = await getCalibrations('test_user');
          if (response.calibrations && response.calibrations.length > 0) {
            const latestCalibration = response.calibrations[0].filename;
            setCalibrationFile(latestCalibration);
            setCalibrationStatus(CalibrationStatus.Completed);
            addLog(`✅ 캘리브레이션 완료: ${latestCalibration}`);
            localStorage.setItem('gazeCalibrationFile', latestCalibration);
          } else {
            throw new Error('캘리브레이션 파일을 찾을 수 없습니다');
          }
        } catch (error) {
          setCalibrationStatus(CalibrationStatus.Failed);
          addLog('❌ 캘리브레이션 확인 실패');
          console.error(error);
        }
      }, 10000); // 10초 후 확인

    } catch (error) {
      setCalibrationStatus(CalibrationStatus.Failed);
      addLog('❌ 캘리브레이션 실패');
      console.error('캘리브레이션 오류:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      addLog(`테스트용 비디오 파일 선택: ${file.name}`);
      // 실제로는 여기서 analyzeVideo API를 호출할 수 있습니다
      // 임시로 샘플 결과 파일명을 설정
      setTestResultFile("sample_heatmap_result.json");
      addLog('⚠️ 실제 분석은 서버에서 수행됩니다');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">시선추적 테스트 페이지</h1>
        
        {/* 서버 연결 테스트 */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow">
          <h2 className="text-xl font-semibold mb-4">1. 서버 연결 테스트</h2>
          <div className="flex items-center gap-4 mb-4">
            <Button onClick={testServerConnection}>서버 연결 테스트</Button>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              serverStatus === 'connected' ? 'bg-green-100 text-green-800' :
              serverStatus === 'error' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-600'
            }`}>
              {serverStatus === 'connected' ? '연결됨' :
               serverStatus === 'error' ? '연결 실패' : '미확인'}
            </div>
          </div>
          <div className="text-sm text-gray-600">
            서버 실행 명령: <code className="bg-gray-100 px-2 py-1 rounded">cd ai/ai-server/Gaze_TR_pro && python gaze_server.py</code>
          </div>
        </div>

        {/* 캘리브레이션 테스트 */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow">
          <h2 className="text-xl font-semibold mb-4">2. 캘리브레이션 테스트</h2>
          <div className="flex items-center gap-4 mb-4">
            <Button 
              onClick={runTestCalibration}
              disabled={serverStatus !== 'connected' || calibrationStatus === CalibrationStatus.InProgress}
            >
              {calibrationStatus === CalibrationStatus.InProgress ? '진행 중...' : '캘리브레이션 시작'}
            </Button>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              calibrationStatus === CalibrationStatus.Completed ? 'bg-green-100 text-green-800' :
              calibrationStatus === CalibrationStatus.Failed ? 'bg-red-100 text-red-800' :
              calibrationStatus === CalibrationStatus.InProgress ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-600'
            }`}>
              {calibrationStatus === CalibrationStatus.Completed ? '완료' :
               calibrationStatus === CalibrationStatus.Failed ? '실패' :
               calibrationStatus === CalibrationStatus.InProgress ? '진행 중' : '미시작'}
            </div>
          </div>
          {calibrationFile && (
            <div className="text-sm text-gray-600">
              캘리브레이션 파일: <code className="bg-gray-100 px-2 py-1 rounded">{calibrationFile}</code>
            </div>
          )}
        </div>

        {/* 비디오 분석 테스트 */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow">
          <h2 className="text-xl font-semibold mb-4">3. 비디오 분석 테스트</h2>
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              className="mb-2"
            />
            <div className="text-sm text-gray-600">
              테스트용 비디오 파일을 선택하세요 (.mp4, .webm 등)
            </div>
          </div>
        </div>

        {/* 시선 분석 결과 테스트 */}
        {testResultFile && (
          <div className="bg-white rounded-lg p-6 mb-6 shadow">
            <h2 className="text-xl font-semibold mb-4">4. 분석 결과 표시 테스트</h2>
            <GazeAnalysisResult resultFilename={testResultFile} />
          </div>
        )}

        {/* 로그 */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h2 className="text-xl font-semibold mb-4">테스트 로그</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">로그가 여기에 표시됩니다...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))
            )}
          </div>
          <Button 
            onClick={() => setLogs([])} 
            className="mt-4 bg-gray-500 hover:bg-gray-600"
            size="sm"
          >
            로그 지우기
          </Button>
        </div>
      </div>
    </div>
  );
}