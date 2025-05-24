run_backend:
	cd backend && uv run uvicorn main:app --reload

run_frontend:
	cd frontend && npm run dev

run_all:
	make run_backend & make run_frontend