# DT-06 三洋冷氣 UART 模擬器｜專案結構

```text
dt06-dp06-ch340-debug/
├─ README.md                         # GitHub 首頁入口
├─ docs/                             # 分角色的詳細說明
│  ├─ USER-GUIDE.md                  # 一般使用者、EXE、CH340
│  ├─ DEVELOPER-GUIDE.md             # 新電腦、測試、建置
│  └─ HARDWARE-TEST.md               # DT-06 + CH340 實機驗證
├─ simulator-desktop/                # Python 桌面模擬器
│  ├─ app.py                         # 介面與串列埠事件
│  ├─ ac_emulator.py                 # 虛擬冷氣與穩定度狀態機
│  ├─ midea_protocol.py              # UART 編解碼核心
│  ├─ run.ps1 / run-tests.ps1        # .venv 啟動與測試
├─ simulator-web/                    # 獨立 Web Serial 網頁版
├─ tests/                            # 不接硬體即可跑的自動測試
├─ reference/                        # FINAL 韌體與參考文件
├─ firmware-source/                  # 韌體原始碼副本
├─ setup-dev.bat / build-exe.bat     # 建環境與建置 EXE
├─ requirements-dev.txt              # 開發依賴
├─ DT06_三洋冷氣模擬器.exe            # 已交付執行檔
└─ .gitignore                        # 排除環境、快取、建置產物
```

`.venv/`、`build-cache/`、`build-output/`、Python 快取及 PlatformIO 快取不是產品原始碼，
可由腳本或工具重新建立，因此不納入 Git。網頁版與桌面版是兩個獨立程式。
