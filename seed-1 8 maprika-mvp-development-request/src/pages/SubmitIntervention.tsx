import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

interface Organization {
  id: number;
  name: string;
  type: string;
  contact_email: string;
}

interface Sector {
  id: number;
  name: string;
}

const SubmitIntervention = () => {
  const [formData, setFormData] = useState({
    organization_id: '',
    sector_id: '',
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    location_district: '',
    beneficiaries_number: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: organizations } = useQuery<Organization[]>({
    queryKey: ['organizations'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:5000/api/organizations');
      return response.data;
    },
  });

  const { data: sectors } = useQuery<Sector[]>({
    queryKey: ['sectors'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:5000/api/sectors');
      return response.data;
    },
  });

  const submitIntervention = useMutation({
    mutationFn: async (intervention: any) => {
      const response = await axios.post('http://localhost:5000/api/interventions', intervention);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
      navigate('/dashboard');
    },
    onError: () => {
      setError('Failed to submit intervention. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.organization_id || !formData.sector_id || !formData.name || !formData.description || !formData.start_date || !formData.end_date || !formData.location_district || !formData.beneficiaries_number) {
      setError('All fields are required');
      return;
    }

    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      setError('End date must be after start date');
      return;
    }

    submitIntervention.mutate({
      ...formData,
      organization_id: parseInt(formData.organization_id),
      sector_id: parseInt(formData.sector_id),
      beneficiaries_number: parseInt(formData.beneficiaries_number),
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit Intervention</h2>
          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="organization_id" className="block text-sm font-medium text-gray-700">
                Organization
              </label>
              <select
                id="organization_id"
                name="organization_id"
                value={formData.organization_id}
                onChange={handleChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">Select an organization</option>
                {organizations?.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="sector_id" className="block text-sm font-medium text-gray-700">
                Sector
              </label>
              <select
                id="sector_id"
                name="sector_id"
                value={formData.sector_id}
                onChange={handleChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">Select a sector</option>
                {sectors?.map((sector) => (
                  <option key={sector.id} value={sector.id}>
                    {sector.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Intervention Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Adult Literacy Campaign"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                name="description"
                id="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Describe the intervention, its goals, and activities..."
              ></textarea>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
                  Start Date
                </label>
                <input
                  type="date"
                  name="start_date"
                  id="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
                  End Date
                </label>
                <input
                  type="date"
                  name="end_date"
                  id="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="location_district" className="block text-sm font-medium text-gray-700">
                District
              </label>
              <input
                type="text"
                name="location_district"
                id="location_district"
                value={formData.location_district}
                onChange={handleChange}
                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Kigali"
              />
            </div>

            <div>
              <label htmlFor="beneficiaries_number" className="block text-sm font-medium text-gray-700">
                Number of Beneficiaries
              </label>
              <input
                type="number"
                name="beneficiaries_number"
                id="beneficiaries_number"
                value={formData.beneficiaries_number}
                onChange={handleChange}
                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., 500"
                min="1"
              />
            </div>

            <div className="pt-5">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitIntervention.isLoading}
                  className="ml-4 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitIntervention.isLoading ? 'Submitting...' : 'Submit Intervention'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default SubmitIntervention;
