function DateFilter({ filters, setFilters, handleApplyFilters }) {
  return (
    <div className="flex flex-wrap gap-4 bg-white p-4 rounded-lg shadow-md mb-4">
      <input
        type="date"
        className="border p-2 rounded"
        value={filters.startDate}
        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
      />
      <input
        type="date"
        className="border p-2 rounded"
        value={filters.endDate}
        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
      />
      <select
        className="border p-2 rounded"
        value={filters.type}
        onChange={(e) => setFilters({ ...filters, type: e.target.value })}
      >
        <option value="">All Crimes</option>
        <option value="Theft">Theft</option>
        <option value="Assault">Assault</option>
        <option value="Robbery">Robbery</option>
      </select>
      <button
        onClick={handleApplyFilters}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Apply Filters
      </button>
    </div>
  );
}

export default DateFilter;
