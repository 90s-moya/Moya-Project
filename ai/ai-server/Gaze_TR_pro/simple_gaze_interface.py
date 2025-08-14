#!/usr/bin/env python3
"""
Simple Gaze Tracking Interface
로컬 데이터 저장을 사용하는 간단한 시선 추적 인터페이스
"""

import os
import json
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from datetime import datetime
import threading

from gaze_calibration import GazeCalibrator
from gaze_tracking import GazeTracker
from calibration_manager import CalibrationManager

class GazeTrackingGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Gaze Tracking System")
        self.root.geometry("800x600")
        
        # 객체 초기화
        self.calibrator = None
        self.tracker = None
        self.manager = CalibrationManager()
        self.current_calibration = None
        
        # 로컬 저장소
        self.storage_file = "gaze_session_data.json"
        self.load_session_data()
        
        self.setup_ui()
        
    def load_session_data(self):
        """세션 데이터 로드"""
        try:
            if os.path.exists(self.storage_file):
                with open(self.storage_file, 'r', encoding='utf-8') as f:
                    self.session_data = json.load(f)
            else:
                self.session_data = {
                    'calibrations': {},
                    'tracking_results': {},
                    'settings': {
                        'screen_width': 1920,
                        'screen_height': 1080,
                        'window_width': 1344,
                        'window_height': 756
                    }
                }
        except Exception as e:
            print(f"Failed to load session data: {e}")
            self.session_data = {
                'calibrations': {},
                'tracking_results': {},
                'settings': {
                    'screen_width': 1920,
                    'screen_height': 1080,
                    'window_width': 1344,
                    'window_height': 756
                }
            }
    
    def save_session_data(self):
        """세션 데이터 저장"""
        try:
            with open(self.storage_file, 'w', encoding='utf-8') as f:
                json.dump(self.session_data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Failed to save session data: {e}")
    
    def setup_ui(self):
        """UI 설정"""
        # 메인 노트북 (탭)
        notebook = ttk.Notebook(self.root)
        notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # 캘리브레이션 탭
        self.calib_frame = ttk.Frame(notebook)
        notebook.add(self.calib_frame, text="Calibration")
        self.setup_calibration_tab()
        
        # 시선 추적 탭
        self.tracking_frame = ttk.Frame(notebook)
        notebook.add(self.tracking_frame, text="Gaze Tracking")
        self.setup_tracking_tab()
        
        # 결과 관리 탭
        self.results_frame = ttk.Frame(notebook)
        notebook.add(self.results_frame, text="Results")
        self.setup_results_tab()
        
        # 설정 탭
        self.settings_frame = ttk.Frame(notebook)
        notebook.add(self.settings_frame, text="Settings")
        self.setup_settings_tab()
    
    def setup_calibration_tab(self):
        """캘리브레이션 탭 설정"""
        # 상단 설정 프레임
        settings_frame = ttk.LabelFrame(self.calib_frame, text="Calibration Settings")
        settings_frame.pack(fill=tk.X, padx=5, pady=5)
        
        # 모드 선택
        ttk.Label(settings_frame, text="Mode:").grid(row=0, column=0, sticky=tk.W, padx=5, pady=2)
        self.calib_mode_var = tk.StringVar(value="quick")
        mode_combo = ttk.Combobox(settings_frame, textvariable=self.calib_mode_var, 
                                 values=["quick", "balanced", "precise", "custom"], state="readonly")
        mode_combo.grid(row=0, column=1, sticky=tk.W, padx=5, pady=2)
        
        # 사용자 ID
        ttk.Label(settings_frame, text="User ID:").grid(row=0, column=2, sticky=tk.W, padx=5, pady=2)
        self.user_id_var = tk.StringVar(value="user01")
        user_entry = ttk.Entry(settings_frame, textvariable=self.user_id_var, width=15)
        user_entry.grid(row=0, column=3, sticky=tk.W, padx=5, pady=2)
        
        # 세션 이름
        ttk.Label(settings_frame, text="Session:").grid(row=1, column=0, sticky=tk.W, padx=5, pady=2)
        self.session_name_var = tk.StringVar(value=f"session_{datetime.now().strftime('%H%M%S')}")
        session_entry = ttk.Entry(settings_frame, textvariable=self.session_name_var, width=20)
        session_entry.grid(row=1, column=1, columnspan=2, sticky=tk.W, padx=5, pady=2)
        
        # 버튼 프레임
        button_frame = ttk.Frame(self.calib_frame)
        button_frame.pack(fill=tk.X, padx=5, pady=5)
        
        self.start_calib_btn = ttk.Button(button_frame, text="Start Calibration", 
                                         command=self.start_calibration)
        self.start_calib_btn.pack(side=tk.LEFT, padx=5)
        
        # 상태 표시
        self.calib_status_var = tk.StringVar(value="Ready")
        status_label = ttk.Label(button_frame, textvariable=self.calib_status_var)
        status_label.pack(side=tk.LEFT, padx=20)
        
        # 저장된 캘리브레이션 목록
        list_frame = ttk.LabelFrame(self.calib_frame, text="Saved Calibrations")
        list_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        self.calib_listbox = tk.Listbox(list_frame)
        self.calib_listbox.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        self.calib_listbox.bind('<Double-1>', self.on_calibration_select)
        
        # 캘리브레이션 관리 버튼
        calib_mgmt_frame = ttk.Frame(list_frame)
        calib_mgmt_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Button(calib_mgmt_frame, text="Refresh", command=self.refresh_calibration_list).pack(side=tk.LEFT, padx=2)
        ttk.Button(calib_mgmt_frame, text="Load", command=self.load_selected_calibration).pack(side=tk.LEFT, padx=2)
        ttk.Button(calib_mgmt_frame, text="Delete", command=self.delete_selected_calibration).pack(side=tk.LEFT, padx=2)
        
        # 초기 목록 로드
        self.refresh_calibration_list()
    
    def setup_tracking_tab(self):
        """시선 추적 탭 설정"""
        # 캘리브레이션 선택
        calib_frame = ttk.LabelFrame(self.tracking_frame, text="Calibration")
        calib_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Label(calib_frame, text="Current Calibration:").pack(side=tk.LEFT, padx=5)
        self.current_calib_var = tk.StringVar(value="None selected")
        ttk.Label(calib_frame, textvariable=self.current_calib_var).pack(side=tk.LEFT, padx=5)
        
        # 추적 옵션
        options_frame = ttk.LabelFrame(self.tracking_frame, text="Tracking Options")
        options_frame.pack(fill=tk.X, padx=5, pady=5)
        
        # 실시간 추적
        live_frame = ttk.Frame(options_frame)
        live_frame.pack(fill=tk.X, padx=5, pady=5)
        
        self.live_track_btn = ttk.Button(live_frame, text="Start Live Tracking", 
                                        command=self.start_live_tracking)
        self.live_track_btn.pack(side=tk.LEFT, padx=5)
        
        ttk.Label(live_frame, text="Duration (sec):").pack(side=tk.LEFT, padx=10)
        self.duration_var = tk.StringVar(value="60")
        duration_entry = ttk.Entry(live_frame, textvariable=self.duration_var, width=10)
        duration_entry.pack(side=tk.LEFT, padx=5)
        
        # 비디오 파일 추적
        video_frame = ttk.Frame(options_frame)
        video_frame.pack(fill=tk.X, padx=5, pady=5)
        
        self.video_track_btn = ttk.Button(video_frame, text="Select Video File", 
                                         command=self.select_video_file)
        self.video_track_btn.pack(side=tk.LEFT, padx=5)
        
        self.video_file_var = tk.StringVar(value="No file selected")
        ttk.Label(video_frame, textvariable=self.video_file_var).pack(side=tk.LEFT, padx=10)
        
        # 상태 표시
        self.tracking_status_var = tk.StringVar(value="Ready")
        status_label = ttk.Label(self.tracking_frame, textvariable=self.tracking_status_var)
        status_label.pack(padx=5, pady=10)
    
    def setup_results_tab(self):
        """결과 관리 탭 설정"""
        # 결과 목록
        list_frame = ttk.LabelFrame(self.results_frame, text="Tracking Results")
        list_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        self.results_listbox = tk.Listbox(list_frame)
        self.results_listbox.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        self.results_listbox.bind('<Double-1>', self.on_result_select)
        
        # 결과 관리 버튼
        result_mgmt_frame = ttk.Frame(list_frame)
        result_mgmt_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Button(result_mgmt_frame, text="Refresh", command=self.refresh_results_list).pack(side=tk.LEFT, padx=2)
        ttk.Button(result_mgmt_frame, text="View", command=self.view_selected_result).pack(side=tk.LEFT, padx=2)
        ttk.Button(result_mgmt_frame, text="Export", command=self.export_selected_result).pack(side=tk.LEFT, padx=2)
        ttk.Button(result_mgmt_frame, text="Delete", command=self.delete_selected_result).pack(side=tk.LEFT, padx=2)
        
        # 초기 목록 로드
        self.refresh_results_list()
    
    def setup_settings_tab(self):
        """설정 탭 설정"""
        # 화면 설정
        screen_frame = ttk.LabelFrame(self.settings_frame, text="Screen Settings")
        screen_frame.pack(fill=tk.X, padx=5, pady=5)
        
        # 화면 크기
        ttk.Label(screen_frame, text="Screen Width:").grid(row=0, column=0, sticky=tk.W, padx=5, pady=2)
        self.screen_width_var = tk.StringVar(value=str(self.session_data['settings']['screen_width']))
        ttk.Entry(screen_frame, textvariable=self.screen_width_var, width=10).grid(row=0, column=1, padx=5, pady=2)
        
        ttk.Label(screen_frame, text="Screen Height:").grid(row=0, column=2, sticky=tk.W, padx=5, pady=2)
        self.screen_height_var = tk.StringVar(value=str(self.session_data['settings']['screen_height']))
        ttk.Entry(screen_frame, textvariable=self.screen_height_var, width=10).grid(row=0, column=3, padx=5, pady=2)
        
        # 윈도우 크기
        ttk.Label(screen_frame, text="Window Width:").grid(row=1, column=0, sticky=tk.W, padx=5, pady=2)
        self.window_width_var = tk.StringVar(value=str(self.session_data['settings']['window_width']))
        ttk.Entry(screen_frame, textvariable=self.window_width_var, width=10).grid(row=1, column=1, padx=5, pady=2)
        
        ttk.Label(screen_frame, text="Window Height:").grid(row=1, column=2, sticky=tk.W, padx=5, pady=2)
        self.window_height_var = tk.StringVar(value=str(self.session_data['settings']['window_height']))
        ttk.Entry(screen_frame, textvariable=self.window_height_var, width=10).grid(row=1, column=3, padx=5, pady=2)
        
        # 설정 저장 버튼
        ttk.Button(screen_frame, text="Save Settings", command=self.save_settings).grid(row=2, column=1, columnspan=2, pady=10)
    
    def start_calibration(self):
        """캘리브레이션 시작"""
        try:
            self.calib_status_var.set("Initializing...")
            self.start_calib_btn.config(state='disabled')
            
            # 설정 값 가져오기
            screen_width = int(self.screen_width_var.get())
            screen_height = int(self.screen_height_var.get())
            window_width = int(self.window_width_var.get())
            window_height = int(self.window_height_var.get())
            
            mode = self.calib_mode_var.get()
            user_id = self.user_id_var.get()
            session_name = self.session_name_var.get()
            
            # 캘리브레이터 초기화
            self.calibrator = GazeCalibrator(screen_width, screen_height, window_width, window_height)
            
            # 백그라운드에서 캘리브레이션 실행
            def run_calibration():
                try:
                    self.calib_status_var.set("Running calibration...")
                    success = self.calibrator.run_calibration(mode)
                    
                    if success:
                        # 캘리브레이션 데이터 저장
                        filepath = self.manager.save_calibration(self.calibrator, user_id, session_name)
                        
                        # 세션 데이터에 추가
                        calib_info = {
                            'filepath': filepath,
                            'user_id': user_id,
                            'session_name': session_name,
                            'timestamp': datetime.now().isoformat(),
                            'mode': mode,
                            'settings': {
                                'screen_width': screen_width,
                                'screen_height': screen_height,
                                'window_width': window_width,
                                'window_height': window_height
                            }
                        }
                        
                        calib_id = os.path.basename(filepath)
                        self.session_data['calibrations'][calib_id] = calib_info
                        self.save_session_data()
                        
                        self.calib_status_var.set("Calibration completed!")
                        self.refresh_calibration_list()
                        messagebox.showinfo("Success", f"Calibration completed and saved as {calib_id}")
                    else:
                        self.calib_status_var.set("Calibration failed!")
                        messagebox.showerror("Error", "Calibration failed or was cancelled")
                
                except Exception as e:
                    self.calib_status_var.set("Error occurred!")
                    messagebox.showerror("Error", f"Calibration error: {str(e)}")
                
                finally:
                    self.start_calib_btn.config(state='normal')
            
            thread = threading.Thread(target=run_calibration)
            thread.daemon = True
            thread.start()
            
        except Exception as e:
            self.calib_status_var.set("Error!")
            self.start_calib_btn.config(state='normal')
            messagebox.showerror("Error", f"Failed to start calibration: {str(e)}")
    
    def refresh_calibration_list(self):
        """캘리브레이션 목록 새로고침"""
        self.calib_listbox.delete(0, tk.END)
        
        # 파일 시스템에서 캘리브레이션 목록 가져오기
        calibrations = self.manager.list_calibrations()
        
        for calib in calibrations:
            display_text = f"{calib['filename']} - {calib['timestamp']} ({calib['user_id']})"
            self.calib_listbox.insert(tk.END, display_text)
    
    def on_calibration_select(self, event):
        """캘리브레이션 더블클릭 이벤트"""
        self.load_selected_calibration()
    
    def load_selected_calibration(self):
        """선택된 캘리브레이션 로드"""
        selection = self.calib_listbox.curselection()
        if not selection:
            return
        
        try:
            calibrations = self.manager.list_calibrations()
            selected_calib = calibrations[selection[0]]
            
            self.current_calibration = selected_calib['filepath']
            self.current_calib_var.set(selected_calib['filename'])
            
            messagebox.showinfo("Success", f"Loaded calibration: {selected_calib['filename']}")
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load calibration: {str(e)}")
    
    def delete_selected_calibration(self):
        """선택된 캘리브레이션 삭제"""
        selection = self.calib_listbox.curselection()
        if not selection:
            return
        
        if messagebox.askyesno("Confirm", "Are you sure you want to delete this calibration?"):
            try:
                calibrations = self.manager.list_calibrations()
                selected_calib = calibrations[selection[0]]
                
                self.manager.delete_calibration(selected_calib['filepath'])
                self.refresh_calibration_list()
                
                messagebox.showinfo("Success", "Calibration deleted successfully")
                
            except Exception as e:
                messagebox.showerror("Error", f"Failed to delete calibration: {str(e)}")
    
    def start_live_tracking(self):
        """실시간 시선 추적 시작"""
        if not self.current_calibration:
            messagebox.showerror("Error", "Please select a calibration first")
            return
        
        try:
            duration = int(self.duration_var.get()) if self.duration_var.get() else None
            
            # 설정 값 가져오기
            screen_width = int(self.screen_width_var.get())
            screen_height = int(self.screen_height_var.get())
            window_width = int(self.window_width_var.get())
            window_height = int(self.window_height_var.get())
            
            # 트래커 초기화
            self.tracker = GazeTracker(screen_width, screen_height, window_width, window_height)
            
            if not self.tracker.load_calibration_data(self.current_calibration):
                messagebox.showerror("Error", "Failed to load calibration data")
                return
            
            self.tracking_status_var.set("Starting live tracking...")
            self.live_track_btn.config(state='disabled')
            
            # 백그라운드에서 추적 실행
            def run_tracking():
                try:
                    success = self.tracker.process_webcam_live(duration)
                    
                    if success:
                        self.tracking_status_var.set("Live tracking completed!")
                        self.refresh_results_list()
                        messagebox.showinfo("Success", "Live tracking completed and results saved")
                    else:
                        self.tracking_status_var.set("Live tracking failed!")
                        messagebox.showwarning("Warning", "Live tracking completed but no data was recorded")
                
                except Exception as e:
                    self.tracking_status_var.set("Error occurred!")
                    messagebox.showerror("Error", f"Tracking error: {str(e)}")
                
                finally:
                    self.live_track_btn.config(state='normal')
            
            thread = threading.Thread(target=run_tracking)
            thread.daemon = True
            thread.start()
            
        except Exception as e:
            self.tracking_status_var.set("Error!")
            self.live_track_btn.config(state='normal')
            messagebox.showerror("Error", f"Failed to start live tracking: {str(e)}")
    
    def select_video_file(self):
        """비디오 파일 선택 및 처리"""
        file_path = filedialog.askopenfilename(
            title="Select Video File",
            filetypes=[("Video files", "*.mp4 *.avi *.mov *.mkv *.webm"), ("All files", "*.*")]
        )
        
        if not file_path:
            return
        
        if not self.current_calibration:
            messagebox.showerror("Error", "Please select a calibration first")
            return
        
        try:
            # 설정 값 가져오기
            screen_width = int(self.screen_width_var.get())
            screen_height = int(self.screen_height_var.get())
            window_width = int(self.window_width_var.get())
            window_height = int(self.window_height_var.get())
            
            # 트래커 초기화
            self.tracker = GazeTracker(screen_width, screen_height, window_width, window_height)
            
            if not self.tracker.load_calibration_data(self.current_calibration):
                messagebox.showerror("Error", "Failed to load calibration data")
                return
            
            self.video_file_var.set(os.path.basename(file_path))
            self.tracking_status_var.set("Processing video...")
            self.video_track_btn.config(state='disabled')
            
            # 백그라운드에서 비디오 처리
            def process_video():
                try:
                    output_prefix = f"video_{os.path.splitext(os.path.basename(file_path))[0]}"
                    success = self.tracker.process_video_file(file_path, output_prefix)
                    
                    if success:
                        self.tracking_status_var.set("Video processing completed!")
                        self.refresh_results_list()
                        messagebox.showinfo("Success", "Video processing completed and results saved")
                    else:
                        self.tracking_status_var.set("Video processing failed!")
                        messagebox.showwarning("Warning", "Video processing completed but no data was tracked")
                
                except Exception as e:
                    self.tracking_status_var.set("Error occurred!")
                    messagebox.showerror("Error", f"Video processing error: {str(e)}")
                
                finally:
                    self.video_track_btn.config(state='normal')
            
            thread = threading.Thread(target=process_video)
            thread.daemon = True
            thread.start()
            
        except Exception as e:
            self.tracking_status_var.set("Error!")
            self.video_track_btn.config(state='normal')
            messagebox.showerror("Error", f"Failed to process video: {str(e)}")
    
    def refresh_results_list(self):
        """결과 목록 새로고침"""
        self.results_listbox.delete(0, tk.END)
        
        results_dir = "results"
        if not os.path.exists(results_dir):
            return
        
        files = []
        for filename in os.listdir(results_dir):
            if filename.endswith('.json'):
                filepath = os.path.join(results_dir, filename)
                stat = os.stat(filepath)
                
                files.append({
                    'filename': filename,
                    'modified': stat.st_mtime,
                    'size': stat.st_size
                })
        
        # 수정 시간 기준 정렬 (최신순)
        files.sort(key=lambda x: x['modified'], reverse=True)
        
        for file_info in files:
            display_text = f"{file_info['filename']} - {datetime.fromtimestamp(file_info['modified']).strftime('%Y-%m-%d %H:%M:%S')}"
            self.results_listbox.insert(tk.END, display_text)
    
    def on_result_select(self, event):
        """결과 더블클릭 이벤트"""
        self.view_selected_result()
    
    def view_selected_result(self):
        """선택된 결과 보기"""
        selection = self.results_listbox.curselection()
        if not selection:
            return
        
        try:
            # 결과 파일 목록에서 선택된 파일 정보 가져오기
            results_dir = "results"
            files = []
            for filename in os.listdir(results_dir):
                if filename.endswith('.json'):
                    filepath = os.path.join(results_dir, filename)
                    stat = os.stat(filepath)
                    files.append({
                        'filename': filename,
                        'modified': stat.st_mtime
                    })
            
            files.sort(key=lambda x: x['modified'], reverse=True)
            selected_file = files[selection[0]]
            
            filepath = os.path.join(results_dir, selected_file['filename'])
            
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # 새 창에서 결과 표시
            result_window = tk.Toplevel(self.root)
            result_window.title(f"Result: {selected_file['filename']}")
            result_window.geometry("600x400")
            
            text_widget = tk.Text(result_window, wrap=tk.WORD)
            text_widget.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
            
            # JSON 데이터를 보기 좋게 표시
            formatted_data = json.dumps(data, indent=2, ensure_ascii=False)
            text_widget.insert(tk.END, formatted_data)
            text_widget.config(state=tk.DISABLED)
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to view result: {str(e)}")
    
    def export_selected_result(self):
        """선택된 결과 내보내기"""
        selection = self.results_listbox.curselection()
        if not selection:
            return
        
        try:
            # 결과 파일 목록에서 선택된 파일 정보 가져오기
            results_dir = "results"
            files = []
            for filename in os.listdir(results_dir):
                if filename.endswith('.json'):
                    filepath = os.path.join(results_dir, filename)
                    stat = os.stat(filepath)
                    files.append({
                        'filename': filename,
                        'modified': stat.st_mtime
                    })
            
            files.sort(key=lambda x: x['modified'], reverse=True)
            selected_file = files[selection[0]]
            
            source_path = os.path.join(results_dir, selected_file['filename'])
            
            # 저장 위치 선택
            save_path = filedialog.asksaveasfilename(
                title="Export Result",
                defaultextension=".json",
                filetypes=[("JSON files", "*.json"), ("All files", "*.*")],
                initialname=selected_file['filename']
            )
            
            if save_path:
                import shutil
                shutil.copy2(source_path, save_path)
                messagebox.showinfo("Success", f"Result exported to: {save_path}")
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to export result: {str(e)}")
    
    def delete_selected_result(self):
        """선택된 결과 삭제"""
        selection = self.results_listbox.curselection()
        if not selection:
            return
        
        if messagebox.askyesno("Confirm", "Are you sure you want to delete this result?"):
            try:
                # 결과 파일 목록에서 선택된 파일 정보 가져오기
                results_dir = "results"
                files = []
                for filename in os.listdir(results_dir):
                    if filename.endswith('.json'):
                        filepath = os.path.join(results_dir, filename)
                        stat = os.stat(filepath)
                        files.append({
                            'filename': filename,
                            'modified': stat.st_mtime
                        })
                
                files.sort(key=lambda x: x['modified'], reverse=True)
                selected_file = files[selection[0]]
                
                filepath = os.path.join(results_dir, selected_file['filename'])
                os.remove(filepath)
                
                self.refresh_results_list()
                messagebox.showinfo("Success", "Result deleted successfully")
                
            except Exception as e:
                messagebox.showerror("Error", f"Failed to delete result: {str(e)}")
    
    def save_settings(self):
        """설정 저장"""
        try:
            self.session_data['settings'] = {
                'screen_width': int(self.screen_width_var.get()),
                'screen_height': int(self.screen_height_var.get()),
                'window_width': int(self.window_width_var.get()),
                'window_height': int(self.window_height_var.get())
            }
            
            self.save_session_data()
            messagebox.showinfo("Success", "Settings saved successfully")
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save settings: {str(e)}")

def main():
    root = tk.Tk()
    app = GazeTrackingGUI(root)
    
    # 종료 시 세션 데이터 저장
    def on_closing():
        app.save_session_data()
        root.destroy()
    
    root.protocol("WM_DELETE_WINDOW", on_closing)
    root.mainloop()

if __name__ == "__main__":
    main()